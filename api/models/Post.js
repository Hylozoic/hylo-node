/* globals _ */
/* eslint-disable camelcase */
import { difference, filter, isNull, omitBy, uniqBy, isEmpty, intersection, isUndefined, pick } from 'lodash/fp'
import { compact, flatten, some, uniq } from 'lodash'
import { postRoom, pushToSockets } from '../services/Websockets'
import { fulfill, unfulfill } from './post/fulfillPost'
import EnsureLoad from './mixins/EnsureLoad'
import { countTotal } from '../../lib/util/knex'
import { refineMany, refineOne } from './util/relations'
import html2text from '../../lib/htmlparser/html2text'
import ProjectMixin from './project/mixin'
import EventMixin from './event/mixin'

export const POSTS_USERS_ATTR_UPDATE_WHITELIST = [
  'project_role_id',
  'following',
  'active'
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
  // Instance Methods

  tableName: 'posts',
  requireFetch: false,

  activities: function () {
    return this.hasMany(Activity)
  },

  comments: function () {
    return this.hasMany(Comment, 'post_id')
  },

  contributions: function () {
    return this.hasMany(Contribution, 'post_id')
  },

  followers: function () {
    return this.belongsToMany(User).through(PostUser)
      .withPivot(['last_read_at'])
      .where({ following: true, 'posts_users.active': true })
  },

  groups: function () {
    return this.belongsToMany(Group).through(PostMembership)
      .query({where: {'groups.active': true }})
  },

  invitees: function () {
    return this.belongsToMany(User).through(EventInvitation)
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
    return this.belongsTo(Location, 'location_id')
  },

  media: function (type) {
    const relation = this.hasMany(Media)
    return type ? relation.query({where: {type}}) : relation
  },

  // TODO: rename postGroups?
  postMemberships: function () {
    return this.hasMany(PostMembership, 'post_id')
  },

  postUsers: function () {
    return this.hasMany(PostUser, 'post_id')
  },

  projectContributions: function () {
    return this.hasMany(ProjectContribution)
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
    .query({where: {selected: true}})
  },

  tags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
  },

  user: function () {
    return this.belongsTo(User)
  },

  userVote: function (userId) {
    return this.votes().query({where: {user_id: userId}}).fetchOne()
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  // TODO: this is confusing and we are not using, remove for now?
  children: function () {
    return this.hasMany(Post, 'parent_post_id')
    .query({where: {active: true}})
  },

  parent: function () {
    return this.belongsTo(Post, 'parent_post_id')
  },

  getTagsInComments: function (opts) {
    // this is part of the 'taggable' interface, shared with Comment
    return this.load('comments.tags', opts)
    .then(() =>
      uniqBy('id', flatten(this.relations.comments.map(c => c.relations.tags.models))))
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

  getDetailsText: async function () {
    return html2text(this.get('description'))
  },

  // Emulate the graphql request for a post in the feed so the feed can be
  // updated via socket. Some fields omitted, linkPreview for example.
  // TODO: if we were in a position to avoid duplicating the graphql layer
  // here, that'd be grand.
  getNewPostSocketPayload: function () {
    const { groups, linkPreview, tags, user } = this.relations

    const creator = refineOne(user, [ 'id', 'name', 'avatar_url' ])
    const topics = refineMany(tags, [ 'id', 'name' ])

    return Object.assign({},
      refineOne(
        this,
        [ 'created_at', 'description', 'id', 'name', 'num_votes', 'type', 'updated_at' ],
        { 'description': 'details', 'name': 'title', 'num_votes': 'votesTotal' }
      ),
      {
        // Shouldn't have commenters immediately after creation
        commenters: [],
        commentsTotal: 0,
        groups: refineMany(groups, [ 'id', 'name', 'slug' ]),
        creator,
        linkPreview: refineOne(linkPreview, [ 'id', 'image_url', 'title', 'url' ]),
        topics,

        // TODO: Once legacy site is decommissioned, these are no longer required.
        creatorId: creator.id,
        tags: topics
      }
    )
  },

  isPublic: function () {
    return this.get('is_public')
  },

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  isThread: function () {
    return this.get('type') === Post.Type.THREAD
  },

  async lastReadAtForUser (userId) {
    const pu = await this.postUsers()
      .query(q => q.where('user_id', userId)).fetchOne()
    return new Date((pu && pu.get('last_read_at')) || 0)
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
      pick(omitBy(attrs, isUndefined), POSTS_USERS_ATTR_UPDATE_WHITELIST)
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

  async removeFollowers (usersOrIds, { transacting } = {}) {
    return this.updateFollowers(usersOrIds, { active: false }, { transacting })
  },

  async updateFollowers (usersOrIds, attrs, { transacting } = {}) {
    if (usersOrIds.length == 0) return []
    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    const existingFollowers = await this.postUsers()
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })
    const updatedAttribs = pick(omitBy(attrs, isUndefined), POSTS_USERS_ATTR_UPDATE_WHITELIST)

    return Promise.map(existingFollowers.models, postUser => postUser.updateAndSave(updatedAttribs, {transacting}))
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

    const mentions = RichText.getUserMentions(this.get('description'))
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
      reason: `eventInvitation`
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

      const isModerator = await GroupMembership.hasModeratorRole(this.get('user_id'), group)
      if (this.get('announcement') && isModerator) {
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

  fulfill,

  unfulfill,

  vote: function (userId, isUpvote) {
    return this.votes().query({where: {user_id: userId}}).fetchOne()
    .then(vote => bookshelf.transaction(trx => {
      var inc = delta => () =>
        this.save({num_votes: this.get('num_votes') + delta}, {transacting: trx})

      return (vote && !isUpvote
        ? vote.destroy({transacting: trx}).then(inc(-1))
        : isUpvote && new Vote({
          post_id: this.id,
          user_id: userId
        }).save().then(inc(1)))
    }))
    .then(() => this)
  },

  removeFromGroup: function (idOrSlug) {
    return PostMembership.find(this.id, idOrSlug)
      .then(membership => membership.destroy())
  }
}, EnsureLoad, ProjectMixin, EventMixin), {
  // Class Methods

  Type: {
    WELCOME: 'welcome',
    REQUEST: 'request',
    OFFER: 'offer',
    RESOURCE: 'resource',
    DISCUSSION: 'discussion',
    EVENT: 'event',
    PROJECT: 'project',
    THREAD: 'thread'
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

  isVisibleToUser: async function (postId, userId) {
    if (!postId || !userId) return Promise.resolve(false)

    const post = await Post.find(postId)

    if (post.isPublic()) return true

    const postGroupIds = await PostMembership.query()
      .where({ post_id: postId }).pluck('group_id')
    const userGroupIds = await Group.pluckIdsForMember(userId)
    if (intersection(postGroupIds, userGroupIds).length > 0) return true
    if (await post.isFollowed(userId)) return true

    // TODO: check this, maybe should be is this post in a child group that you can see? no...
    // const sharesNetwork = await Community.query()
    // .whereIn('id', pcids).pluck('network_id')
    // .then(networkIds =>
    //   Promise.map(compact(uniq(networkIds)), id =>
    //     Network.containsUser(id, userId)))
    // .then(results => some(results))

    return false
  },

  find: function (id, options) {
    return Post.where({id, 'posts.active': true}).fetch(options)
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
    num_votes: 0
  }),

  create: function (attrs, opts) {
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

  fixTypedPosts: () =>
    bookshelf.transaction(transacting =>
      Tag.whereIn('name', ['request', 'offer', 'resource', 'intention'])
      .fetchAll({transacting})
      .then(tags => Post.query(q => {
        q.whereIn('type', ['request', 'offer', 'resource', 'intention'])
      }).fetchAll({withRelated: ['selectedTags', 'tags'], transacting})
      .then(posts => Promise.each(posts.models, post => {
        const untype = () => post.save({type: null}, {patch: true, transacting})
        if (post.relations.selectedTags.first()) return untype()

        const matches = t => t.get('name') === post.get('type')
        const existingTag = post.relations.tags.find(matches)
        if (existingTag) {
          return PostTag.query()
          .where({post_id: post.id, tag_id: existingTag.id})
          .update({selected: true}).transacting(transacting)
          .then(untype)
        }

        return post.selectedTags().attach(tags.find(matches).id, {transacting})
        .then(untype)
      }))
      .then(promises => promises.length))),

  // TODO: does this work?
  notifySlack: ({ postId }) =>
    Post.find(postId, {withRelated: ['groups', 'user', 'relatedUsers']})
    .then(post => {
      if (!post) return
      const slackCommunities = post.relations.groups.filter(c => c.get('slack_hook_url'))
      return Promise.map(slackCommunities, c => Group.notifySlack(c.id, post))
    })
})
