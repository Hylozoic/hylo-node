/* globals _ */

import data from '@emoji-mart/data'
import { init, getEmojiDataFromNative } from 'emoji-mart'
import { difference, filter, isNull, omitBy, uniqBy, isEmpty, intersection, isUndefined, pick } from 'lodash/fp'
import format from 'pg-format'
import { flatten, sortBy } from 'lodash'
import { TextHelpers } from 'hylo-shared'
import fetch from 'node-fetch'
import { postRoom, pushToSockets } from '../services/Websockets'
import { fulfill, unfulfill } from './post/fulfillPost'
import EnsureLoad from './mixins/EnsureLoad'
import { countTotal } from '../../lib/util/knex'
import { refineMany, refineOne } from './util/relations'
import ProjectMixin from './project/mixin'
import EventMixin from './event/mixin'
import * as RichText from '../services/RichText'

init({ data })

export const POSTS_USERS_ATTR_UPDATE_WHITELIST = [
  'project_role_id',
  'following',
  'active',
  'clickthrough'
]

const commentersQuery = (limit, post, currentUserId) => q => {
  q.select('users.*', 'comments.user_id')
  q.join('comments', 'comments.user_id', 'users.id')

  q.where({
    'comments.post_id': post.id,
    'comments.active': true
  })

  if (currentUserId) {
    q.whereNotIn('users.id', BlockedUser.blockedFor(currentUserId))
    q.orderBy(bookshelf.knex.raw(`case when user_id = ${currentUserId} then -1 else user_id end`))
  }

  q.groupBy('users.id', 'comments.user_id')
  if (limit) q.limit(limit)
}

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'posts',
  requireFetch: false,
  hasTimestamps: true,

  // Instance Methods

  // Simple attribute getters

  // This should be always used when accessing this attribute
  details: function (forUserId) {
    return RichText.processHTML(this.get('description'), { forUserId })
  },

  description: function (forUserId) {
    console.warn('Deprecation warning: Post#description called but has been replaced by Post#details')
    return this.details(forUserId)
  },

  title: function () {
    return this.get('name')
  },

  // To handle posts without a name/title
  summary: function () {
    return this.get('name') || TextHelpers.presentHTMLToText(this.details(), { truncate: 80 })
  },

  isPublic: function () {
    return this.get('is_public')
  },

  isChat: function () {
    return this.get('type') === Post.Type.CHAT
  },

  isProposal: function () {
    return this.get('type') === Post.Type.PROPOSAL
  },

  isThread: function () {
    return this.get('type') === Post.Type.THREAD
  },

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  flaggedGroups: function () {
    return this.get('flagged_groups') || []
  },

  commentsTotal: function () {
    return this.get('num_comments')
  },

  peopleReactedTotal: function () {
    return this.get('num_people_reacts')
  },

  // Relations

  activities: function () {
    return this.hasMany(Activity)
  },

  collections: function () {
    return this.belongsToMany(Collection).through(CollectionsPost)
  },

  collectionsPosts: function () {
    return this.hasMany(CollectionsPost, 'post_id')
  },

  contributions: function () {
    return this.hasMany(Contribution, 'post_id')
  },

  followers: function () {
    return this.belongsToMany(User).through(PostUser)
      // .withPivot(['last_read_at', 'clickthrough']) // TODO COMOD: does not seem to work
      .withPivot(['last_read_at'])
      .where({ following: true, 'posts_users.active': true, 'users.active': true })
  },

  groups: function () {
    return this.belongsToMany(Group).through(PostMembership)
      .query({ where: { 'groups.active': true } })
  },

  async isFollowed (userId) {
    const pu = await PostUser.find(this.id, userId)
    return !!(pu && pu.get('following'))
  },

  comments: function () {
    return this.hasMany(Comment, 'post_id').query({ where: {
      'comments.active': true,
      'comments.comment_id': null
    }})
  },

  linkPreview: function () {
    return this.belongsTo(LinkPreview)
  },

  locationObject: function () {
    return this.isChat() ? false : this.belongsTo(Location, 'location_id')
  },

  media: function (type) {
    const relation = this.hasMany(Media)
    return type ? relation.query({ where: { type } }) : relation
  },

  moderationActions: function () {
    return this.hasMany(ModerationAction)
  },

  postMemberships: function () {
    return this.hasMany(PostMembership, 'post_id')
  },

  postUsers: function () {
    return this.hasMany(PostUser, 'post_id')
  },

  projectContributions: function () {
    return this.hasMany(ProjectContribution)
  },

  proposalOptions: function () {
    return this.get('type') === Post.Type.PROPOSAL ? this.hasMany(ProposalOption) : null
  },

  proposalVotes: function () {
    return this.get('type') === Post.Type.PROPOSAL ? this.hasMany(ProposalVote) : null
  },

  reactions: function () {
    return this.hasMany(Reaction, 'entity_id').where({ 'reactions.entity_type': 'post' })
  },

  responders: function () {
    return this.belongsToMany(User).through(EventResponse)
  },

  relatedUsers: function () {
    return this.belongsToMany(User, 'posts_about_users')
  },

  // should only be one of these per post
  selectedTags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
      .query({ where: { selected: true } })
  },

  tags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
  },

  user: function () {
    return this.belongsTo(User)
  },

  reactionsForUser: function (userId, emojiFull) {
    const q = this.reactions()
    if (userId) {
      q.query({ where: { 'reactions.user_id': userId } })
    }

    if (emojiFull) {
      q.query({ where: { 'reactions.emoji_full': emojiFull } })
    }

    return q
  },

  // TODO: this is confusing and we are not using, remove for now?
  children: function () {
    return this.hasMany(Post, 'parent_post_id')
      .query({ where: { active: true } })
  },

  parent: function () {
    return this.belongsTo(Post, 'parent_post_id')
  },

  getTagsInComments: function (opts) {
    // this is part of the 'taggable' interface, shared with Comment
    return this.load('comments.tags', opts)
      .then(() => uniqBy('id', flatten(this.relations.comments.map(c => c.relations.tags.models))))
  },

  getCommenters: function (first, currentUserId) {
    return User.query(commentersQuery(first, this, currentUserId)).fetchAll()
  },

  getCommentersTotal: function (currentUserId) {
    return countTotal(User.query(commentersQuery(null, this, currentUserId)).query(), 'users')
    .then(result => {
      if (isEmpty(result)) {
        return 0
      } else {
        return result[0].total
      }
    })
  },

  // Emulate the graphql request for a post in the feed so the feed can be
  // updated via socket. Some fields omitted.
  // TODO: if we were in a position to avoid duplicating the graphql layer
  // here, that'd be grand.
  getNewPostSocketPayload: function () {
    const { groups, linkPreview, tags, user, proposalOptions } = this.relations

    const creator = refineOne(user, [ 'id', 'name', 'avatar_url' ])
    const topics = refineMany(tags, [ 'id', 'name' ])

    // TODO: Sanitization -- sanitize details here if not passing through `text` getter
    return Object.assign({},
      refineOne(
        this,
        ['created_at', 'description', 'id', 'name', 'num_people_reacts', 'timezone', 'type', 'updated_at', 'num_votes', 'votingMethod', 'proposalStatus', 'proposalOutcome'],
        { description: 'details', name: 'title', num_people_reacts: 'peopleReactedTotal', num_votes: 'votesTotal' }
      ),
      {
        // Shouldn't have commenters immediately after creation
        commenters: [],
        proposalVotes: [],
        commentsTotal: 0,
        details: this.details(),
        groups: refineMany(groups, [ 'id', 'name', 'slug' ]),
        creator,
        linkPreview: refineOne(linkPreview, [ 'id', 'image_url', 'title', 'description', 'url' ]),
        topics,
        proposalOptions,

        // TODO: Once legacy site is decommissioned, these are no longer required.
        creatorId: creator.id,
        tags: topics
      }
    )
  },

  async lastReadAtForUser (userId) {
    const pu = await this.postUsers()
      .query(q => q.where('user_id', userId)).fetchOne()
    return new Date((pu && pu.get('last_read_at')) || 0)
  },

  async checkClickthrough (userId) {
    const pu = await this.postUsers()
      .query(q => q.where('user_id', userId)).fetchOne()
    return (pu && pu.get('clickthrough')) || null
  },

  totalContributions: async function () {
    await this.load('projectContributions')
    return this.relations.projectContributions.models.reduce((total, contribution) => total + contribution.get('amount'), 0)
  },

  unreadCountForUser: function (userId) {
    return this.lastReadAtForUser(userId)
    .then(date => {
      if (date > this.get('updated_at')) return 0
      return Aggregate.count(this.comments().query(q =>
        q.where('created_at', '>', date)))
    })
  },

  // ****** Setters ******//

  async addFollowers (usersOrIds, attrs = {}, { transacting } = {}) {
    const updatedAttribs = Object.assign(
      { active: true, following: true },
      pick(POSTS_USERS_ATTR_UPDATE_WHITELIST, omitBy(isUndefined, attrs))
    )

    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    const existingFollowers = await this.postUsers()
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })
    const existingUserIds = existingFollowers.pluck('user_id')
    const newUserIds = difference(userIds, existingUserIds)
    const updatedFollowers = await this.updateFollowers(existingUserIds, updatedAttribs, { transacting })
    const newFollowers = []
    for (let id of newUserIds) {
      const follower = await this.postUsers().create(
        Object.assign({}, updatedAttribs, {
          user_id: id,
          created_at: new Date(),
        }), { transacting })
      newFollowers.push(follower)
    }
    return updatedFollowers.concat(newFollowers)
  },

  async addProposalVote ({ userId, optionId }) {
    return ProposalVote.forge({ post_id: this.id, user_id: userId, option_id: optionId, created_at: new Date() }).save()
  },

  async removeFollowers (usersOrIds, { transacting } = {}) {
    return this.updateFollowers(usersOrIds, { active: false }, { transacting })
  },

  async removeProposalVote ({ userId, optionId }) {
    const vote = await ProposalVote.query({ where: { user_id: userId, option_id: optionId } }).fetch()
    return vote.destroy()
  },

  async setProposalOptions ({ options = [], userId, opts = {} }) {
    opts.transacting ||= { transacting: false }
    const deleteQuery = format('DELETE FROM proposal_options WHERE post_id = %L', this.id)

    const insertValues = options.map(option => {
      return [
        this.id,
        option.text,
        option.color || '',
        option.emoji || ''
      ]
    })

    const insertQuery = format('INSERT INTO proposal_options (post_id, text, color, emoji) VALUES %L RETURNING id', insertValues)

    const fullQuery = `
    BEGIN;
    ${deleteQuery};
    ${insertQuery};
    COMMIT;
`
    return bookshelf.knex.raw(fullQuery).transacting(opts.transacting)
  },

  async swapProposalVote ({ userId, removeOptionId, addOptionId }) {
    await this.removeProposalVote({ userId, optionId: removeOptionId })
    return this.addProposalVote({ userId, optionId: addOptionId })
  },

  async updateFollowers (usersOrIds, attrs, { transacting } = {}) {
    if (usersOrIds.length === 0) return []
    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    const existingFollowers = await this.postUsers()
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })
    const updatedAttribs = pick(POSTS_USERS_ATTR_UPDATE_WHITELIST, omitBy(isUndefined, attrs))
    return Promise.map(existingFollowers.models, postUser => postUser.updateAndSave(updatedAttribs, { transacting }))
  },

  async updateProposalOptions ({ options = [], userId, opts = {} }) {
    opts.transacting ||= { transacting: false }
    const existingOptions = await this.proposalOptions().fetch({ transacting: opts.transacting, require: false })
    const existingOptionIds = existingOptions.pluck('id')

    // Add activities for vote reset
    if (options.length > 0 && existingOptionIds.length > 0) {
      await this.createVoteResetActivities(opts.transacting)
    }

    // Delete ALL votes any time options are updated
    if (options.length > 0 && existingOptionIds.length > 0) {
      const deleteVotesQuery = `
        DELETE FROM proposal_votes
        WHERE option_id IN (${existingOptionIds.join(', ')});
      `
      await bookshelf.knex.raw(deleteVotesQuery).transacting(opts.transacting)
    }
    // Delete all options and start fresh
    if (options.length > 0 && existingOptionIds.length > 0) {
      const deleteQuery = `
        DELETE FROM proposal_options
        WHERE id IN (${existingOptionIds.join(', ')});
      `
      await bookshelf.knex.raw(deleteQuery).transacting(opts.transacting)
    }

    // Execute the insert query for options passed in
    if (options.length > 0) {
      const insertQuery = `
        INSERT INTO proposal_options (post_id, text, color, emoji)
        VALUES ${options.map(option => `(${this.id}, '${option.text}', '${option.color}', '${option.emoji}')`).join(', ')};
      `
      await bookshelf.knex.raw(insertQuery).transacting(opts.transacting)
    }

    // Return a resolved promise
    return Promise.resolve()
  },

  async markAsRead (userId) {
    const pu = await this.postUsers()
      .query(q => q.where('user_id', userId)).fetchOne()
    return pu.save({ last_read_at: new Date() })
  },

  pushTypingToSockets: function (userId, userName, isTyping, socketToExclude) {
    pushToSockets(postRoom(this.id), 'userTyping', {userId, userName, isTyping}, socketToExclude)
  },

  copy: function (attrs) {
    var that = this.clone()
    _.merge(that.attributes, Post.newPostAttrs(), attrs)
    delete that.id
    delete that.attributes.id
    that._previousAttributes = {}
    that.changed = {}
    return that
  },

  createActivities: async function (trx) {
    await this.load(['groups', 'tags'], {transacting: trx})
    const { tags, groups } = this.relations

    const tagFollows = await TagFollow.query(qb => {
      qb.whereIn('tag_id', tags.map('id'))
      qb.whereIn('group_id', groups.map('id'))
    })
    .fetchAll({withRelated: ['tag'], transacting: trx})

    const tagFollowers = tagFollows.map(tagFollow => ({
      reader_id: tagFollow.get('user_id'),
      post_id: this.id,
      actor_id: this.get('user_id'),
      group_id: tagFollow.get('group_id'),
      reason: `tag: ${tagFollow.relations.tag.get('name')}`
    }))

    const mentions = RichText.getUserMentions(this.details())
    const mentioned = mentions.map(userId => ({
      reader_id: userId,
      post_id: this.id,
      actor_id: this.get('user_id'),
      reason: 'mention'
    }))

    const eventInvitations = await EventInvitation.query(qb => {
      qb.where('event_id', this.id)
    })
    .fetchAll({transacting: trx})

    const invitees = eventInvitations.map(eventInvitation => ({
      reader_id: eventInvitation.get('user_id'),
      post_id: this.id,
      actor_id: eventInvitation.get('inviter_id'),
      reason: 'eventInvitation'
    }))

    let members = await Promise.all(groups.map(async group => {
      const userIds = await group.members().fetch().then(u => u.pluck('id'))
      const newPosts = userIds.map(userId => ({
        reader_id: userId,
        post_id: this.id,
        actor_id: this.get('user_id'),
        group_id: group.id,
        reason: `newPost: ${group.id}`
      }))

      // TODO: RESP. moderators can also make announcements?
      const hasAdministration = await GroupMembership.hasResponsibility(this.get('user_id'), group, Responsibility.constants.RESP_ADMINISTRATION)
      if (this.get('announcement') && hasAdministration) {
        const announcees = userIds.map(userId => ({
          reader_id: userId,
          post_id: this.id,
          actor_id: this.get('user_id'),
          group_id: group.id,
          reason: `announcement: ${group.id}`
        }))
        return newPosts.concat(announcees)
      }

      return newPosts
    }))

    members = flatten(members)

    const readers = filter(r => r.reader_id !== this.get('user_id'),
      mentioned.concat(members).concat(tagFollowers).concat(invitees))

    return Activity.saveForReasons(readers, trx)
  },

  createVoteResetActivities: async function (trx) {
    const voterIds = await ProposalVote.getVoterIdsForPost(this.id).fetchAll({ transacting: trx })
    if (!voterIds || voterIds.length === 0) return Promise.resolve()

    const voters = voterIds.map(voterId => ({
      reader_id: voterId.get('user_id'),
      post_id: this.id,
      actor_id: this.get('user_id'),
      reason: 'voteReset'
    }))

    return Activity.saveForReasons(voters, trx)
  },

  fulfill,

  unfulfill,

  // TODO: Remove this once mobile has been updated
  vote: function (userId, isUpvote) {
    return isUpvote ? this.addReaction(userId, '\uD83D\uDC4D') : this.deleteReaction(userId, '\uD83D\uDC4D')
  },

  addReaction: function (userId, emojiFull) {
    return bookshelf.transaction(async trx => {
      const userReactions = await this.reactionsForUser(userId).fetch()
      const deltaPeople = userReactions?.models?.length > 0 ? 0 : 1
      const userReaction = userReactions.filter(reaction => reaction.attributes?.emoji_full === emojiFull)[0]

      // If user has alread reacted with this emoji on this post then ignore this
      if (userReaction) {
        return false
      }

      const reactionsSummary = this.get('reactions_summary') || {}
      const reactionCount = reactionsSummary[emojiFull] || 0

      const emojiObject = await getEmojiDataFromNative(emojiFull)

      await new Reaction({
        date_reacted: new Date(),
        entity_id: this.id,
        user_id: userId,
        emoji_base: emojiFull,
        emoji_full: emojiFull,
        entity_type: 'post',
        emoji_label: emojiObject.shortcodes
      }).save({}, { transacting: trx })

      await this.save({
        num_people_reacts: this.get('num_people_reacts') + deltaPeople,
        reactions_summary: { ...reactionsSummary, [emojiFull]: reactionCount + 1 }
      }, { transacting: trx })

      return this
    })
  },

  deleteReaction: function (userId, emojiFull) {
    return bookshelf.transaction(async trx => {
      const userReactionsModels = await this.reactionsForUser(userId).fetch({ transacting: trx })
      const userReactions = userReactionsModels.models
      const userReaction = userReactions.filter(reaction => reaction.attributes?.emoji_full === emojiFull)[0]
      if (!userReaction) {
        return false
      }

      // is this the last reaction on this post from this user?
      const isLastReaction = userReactions.length === 1

      await userReaction.destroy({ transacting: trx })

      const reactionsSummary = this.get('reactions_summary')
      const reactionCount = reactionsSummary[emojiFull] || 0

      if (isLastReaction) {
        await this.save({
          num_people_reacts: this.get('num_people_reacts') - 1,
          reactions_summary: { ...reactionsSummary, [emojiFull]: reactionCount - 1 }
        }, { transacting: trx })
      } else {
        const reactionsSummary = this.get('reactions_summary')
        await this.save({ reactions_summary: { ...reactionsSummary, [emojiFull]: reactionCount - 1 } }, { transacting: trx })
      }
      return this
    })
  },

  updateProposalOutcome: function (proposalOutcome) {
    return Post.where({ id: this.id }).query().update({ proposal_outcome: proposalOutcome})
  },

  removeFromGroup: function (idOrSlug) {
    return PostMembership.find(this.id, idOrSlug)
      .then(membership => membership.destroy())
  }
}, EnsureLoad, ProjectMixin, EventMixin), {
  // Class Methods

  Type: {
    CHAT: 'chat',
    DISCUSSION: 'discussion',
    EVENT: 'event',
    OFFER: 'offer',
    PROJECT: 'project',
    PROPOSAL: 'proposal',
    REQUEST: 'request',
    RESOURCE: 'resource',
    THREAD: 'thread',
    WELCOME: 'welcome'
  },

  Proposal_Status: {
    DISCUSSION: 'discussion',
    COMPLETED: 'completed',
    VOTING: 'voting',
    CASUAL: 'casual'
  },

  Proposal_Outcome: {
    CANCELLED: 'cancelled',
    QUORUM_NOT_MET: 'quorum-not-met',
    INCOMPLETE: 'incomplete',
    IN_PROGRESS: 'in-progress',
    SUCCESSFUL: 'successful',
    TIE: 'tie'
  },

  voting_method: {
    SINGLE: 'single',
    MULTI_UNRESTRICTED: 'multi-unrestricted'
    // unused for now
    // MAJORITY: 'majority', // one option must have more than 50% of votes for the proposal to 'pass',
    // CONSENSUS: 'consensus' // Will not pass if there are any block votes
  },

  // TODO Consider using Visibility property for more granular privacy
  // as our work on Public Posts evolves
  Visibility: {
    DEFAULT: 0,
    PUBLIC_READABLE: 1
  },

  countForUser: function (user, type) {
    const attrs = {user_id: user.id, 'posts.active': true}
    if (type) attrs.type = type
    return this.query().count().where(attrs).then(rows => rows[0].count)
  },

  groupedCountForUser: function (user) {
    return this.query(q => {
      q.join('posts_tags', 'posts.id', 'posts_tags.post_id')
      q.join('tags', 'tags.id', 'posts_tags.tag_id')
      q.whereIn('tags.name', ['request', 'offer', 'resource'])
      q.groupBy('tags.name')
      q.where({'posts.user_id': user.id, 'posts.active': true})
      q.select('tags.name')
    }).query().count()
    .then(rows => rows.reduce((m, n) => {
      m[n.name] = n.count
      return m
    }, {}))
  },

  havingExactFollowers (userIds) {
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      q.join('posts_users', 'posts.id', 'posts_users.post_id')
      q.where('posts_users.active', true)
      q.groupBy('posts.id')
      q.having(bookshelf.knex.raw(`array_agg(posts_users.user_id order by posts_users.user_id) = ?`, [userIds]))
    })
  },

  isVisibleToUser: async function (postId, userId) {
    if (!postId || !userId) return Promise.resolve(false)
    const post = await Post.find(postId)
    if (post.isPublic()) return true

    const postGroupIds = await PostMembership.query()
      .where({ post_id: postId }).pluck('group_id')
    const userGroupIds = await Group.pluckIdsForMember(userId)

    if (intersection(postGroupIds, userGroupIds).length > 0) return true
    if (await post.isFollowed(userId)) return true

    return false
  },

  addToFlaggedGroups: async function ({ groupId, postId }) {
    return bookshelf.knex.raw(`
      UPDATE posts
      SET flagged_groups = array_append(flagged_groups, ?)
      WHERE id = ?
    `, [groupId, postId])
  },

  removeFromFlaggedGroups: async function ({ groupId, postId }) {
    // The regular postgres array_remove function removes *ALL* matches to whatever is passed in.
    // There might be several flags for different violations and we want to be able to remove them one by one if needed
    return bookshelf.knex.raw(`
      UPDATE posts
      SET flagged_groups = (
        SELECT array_agg(elem)
        FROM unnest(flagged_groups) WITH ORDINALITY AS t(elem, ord)
        WHERE elem != ? OR ord != (SELECT min(ord) FROM unnest(flagged_groups) WITH ORDINALITY AS t(elem, ord) WHERE elem = ?)
      )
      WHERE id = ?
    `, [groupId, groupId, postId])
  },

  find: function (id, options) {
    return Post.where({ id, 'posts.active': true }).fetch(options)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Post
    }
    return collection.query(function (qb) {
      qb.whereRaw('posts.created_at between ? and ?', [startTime, endTime])
      qb.where('posts.active', true)
    })
  },

  newPostAttrs: () => ({
    created_at: new Date(),
    updated_at: new Date(),
    active: true,
    num_comments: 0,
    num_people_reacts: 0
  }),

  create: function (attrs, opts) {
    console.log('entering Post.create')
    return Post.forge(_.merge(Post.newPostAttrs(), attrs))
    .save(null, _.pick(opts, 'transacting'))
  },

  async updateFromNewComment ({ postId, commentId }) {
    const where = {post_id: postId, 'comments.active': true}
    const now = new Date()

    return Promise.all([
      Comment.query().where(where).orderBy('created_at', 'desc').limit(2)
      .pluck('id').then(ids => Promise.all([
        Comment.query().whereIn('id', ids).update('recent', true),
        Comment.query().whereNotIn('id', ids)
        .where({recent: true, post_id: postId})
        .update('recent', false)
      ])),

      // update num_comments and updated_at (only update the latter when
      // creating a comment, not deleting one)
      Aggregate.count(Comment.where(where)).then(count =>
        Post.query().where('id', postId).update(omitBy(isNull, {
          num_comments: count,
          updated_at: commentId ? now : null
        }))),

      // when creating a comment, mark post as read for the commenter
      commentId && Comment.where('id', commentId).query().pluck('user_id')
      .then(([ userId ]) => Post.find(postId)
        .then(post => post.markAsRead(userId)))
    ])
  },

  deactivate: postId =>
    bookshelf.transaction(trx =>
      Promise.join(
        Activity.removeForPost(postId, trx),
        Post.where('id', postId).query().update({active: false}).transacting(trx)
      )),

  createActivities: (opts) =>
    Post.find(opts.postId).then(post => post &&
      bookshelf.transaction(trx => post.createActivities(trx))),

  // TODO: remove, unused (??)
  fixTypedPosts: () =>
    bookshelf.transaction(transacting =>
      Tag.whereIn('name', ['request', 'offer', 'resource', 'intention'])
        .fetchAll({ transacting })
        .then(tags => Post.query(q => {
          q.whereIn('type', ['request', 'offer', 'resource', 'intention'])
        }).fetchAll({ withRelated: ['selectedTags', 'tags'], transacting })
          .then(posts => Promise.each(posts.models, post => {
            const untype = () => post.save({ type: null }, { patch: true, transacting })
            if (post.relations.selectedTags.first()) return untype()

            const matches = t => t.get('name') === post.get('type')
            const existingTag = post.relations.tags.find(matches)
            if (existingTag) {
              return PostTag.query()
                .where({ post_id: post.id, tag_id: existingTag.id })
                .update({ selected: true }).transacting(transacting)
                .then(untype)
            }

            return post.selectedTags().attach(tags.find(matches).id, { transacting })
              .then(untype)
          }))
          .then(promises => promises.length))),

  // TODO: does this work?
  notifySlack: ({ postId }) =>
    Post.find(postId, { withRelated: ['groups', 'user', 'relatedUsers'] })
      .then(post => {
        if (!post) return
        const slackCommunities = post.relations.groups.filter(g => g.get('slack_hook_url'))
        return Promise.map(slackCommunities, g => Group.notifySlack(g.id, post))
      }),

  updateProposalStatuses: async () => {
    return bookshelf.knex.raw(
      `UPDATE posts
      SET proposal_status = 
          CASE 
              WHEN proposal_status NOT IN ('casual', 'completed') 
                   AND type = 'proposal' 
                   AND CURRENT_TIMESTAMP BETWEEN start_time AND end_time 
                   THEN 'voting'
              WHEN proposal_status NOT IN ('casual', 'completed') 
                   AND type = 'proposal' 
                   AND CURRENT_TIMESTAMP > end_time 
                   THEN 'completed'
              ELSE proposal_status
          END
      WHERE type = 'proposal' 
        AND proposal_status NOT IN ('casual', 'completed') 
        AND start_time IS NOT NULL 
        AND end_time IS NOT NULL;`
    )
  },

  // Background task to fire zapier triggers on new_post
  zapierTriggers: async ({ postId }) => {
    const post = await Post.find(postId, { withRelated: ['groups', 'tags', 'user'] })
    if (!post) return
    const tags = post.relations.tags
    const firstTag = tags && tags.first()?.get('name')

    const groupIds = post.relations.groups.map(g => g.id)
    const zapierTriggers = await ZapierTrigger.forTypeAndGroups('new_post', groupIds).fetchAll()
    if (zapierTriggers && zapierTriggers.length > 0) {
      for (const trigger of zapierTriggers) {
        // Check if this trigger is only for certain post types and if so whether it matches this post type
        if (trigger.get('params')?.types?.length > 0 && !trigger.get('params').types.includes(post.get('type'))) {
          continue
        }

        const entityUrl = (post.get('type') === Post.Type.CHAT && post.relations.groups.length > 0 && firstTag)
          ? Frontend.Route.chatPostForMobile(post, post.relations.groups[0], firstTag)
          : Frontend.Route.post(post, post.relations.groups[0])

        const creator = post.relations.user
        const response = await fetch(trigger.get('target_url'), {
          method: 'post',
          body: JSON.stringify({
            id: post.id,
            announcement: post.get('announcement'),
            createdAt: post.get('created_at'),
            creator: { name: creator.get('name'), url: Frontend.Route.profile(creator) },
            details: post.details(),
            endTime: post.get('end_time'),
            isPublic: post.get('is_public'),
            location: post.get('location'),
            startTime: post.get('start_time'),
            timezone: post.get('timezone'),
            title: post.summary(),
            type: post.get('type'),
            url: entityUrl,
            groups: post.relations.groups.map(g => ({ id: g.id, name: g.get('name'), url: Frontend.Route.group(g), postUrl: Frontend.Route.post(post, g) })),
            topics: post.relations.tags.map(t => ({ name: t.get('name') }))
          }),
          headers: { 'Content-Type': 'application/json' }
        })
        // TODO: what to do with the response? check if succeeded or not?
      }
    }
  }

})
