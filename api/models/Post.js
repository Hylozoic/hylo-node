/* globals _ */
/* eslint-disable camelcase */
import { filter, isNull, omitBy, uniqBy, isEmpty, intersection } from 'lodash/fp'
import { compact, flatten, some, uniq } from 'lodash'
import { postRoom, pushToSockets } from '../services/Websockets'
import { fulfill, unfulfill } from './post/fulfillPost'
import EnsureLoad from './mixins/EnsureLoad'
import HasGroup from './mixins/HasGroup'
import { countTotal } from '../../lib/util/knex'
import { refineMany, refineOne } from './util/relations'
import { isFollowing } from './group/queryUtils'
import html2text from '../../lib/htmlparser/html2text'
import ProjectMixin from './project/mixin'
import EventMixin from './event/mixin'

const commentersQuery = (limit, post, currentUserId) => q => {
  q.select('users.*', 'comments.user_id')
  q.join('comments', 'comments.user_id', 'users.id')
  q.where('users.id', 'NOT IN', BlockedUser.blockedFor(currentUserId))
  q.where({
    'comments.post_id': post.id,
    'comments.active': true
  })
  if (currentUserId) {
    q.orderBy(bookshelf.knex.raw(`case when user_id = ${currentUserId} then -1 else user_id end`))
  }
  q.groupBy('users.id', 'comments.user_id')
  if (limit) q.limit(limit)
}

module.exports = bookshelf.Model.extend(Object.assign({
  // Instance Methods

  tableName: 'posts',

  user: function () {
    return this.belongsTo(User)
  },

  communities: function () {
    return this.belongsToMany(Community).through(PostMembership)
    .query({where: {'communities.active': true}})
  },

  networks: function () {
    return this.belongsToMany(Network).through(PostNetworkMembership)
  },

  followers: function () {
    return this.groupMembers(q => isFollowing(q))
  },

  followersWithPivots: function () {
    return this.groupMembersWithPivots().query(q => isFollowing(q))
  },

  contributions: function () {
    return this.hasMany(Contribution, 'post_id')
  },

  postMemberships: function () {
    return this.hasMany(PostMembership, 'post_id')
  },

  comments: function () {
    return this.hasMany(Comment, 'post_id').query({where: {active: true}})
  },

  locationObject: function () {
    return this.belongsTo(Location, 'location_id')
  },

  media: function (type) {
    const relation = this.hasMany(Media)
    return type ? relation.query({where: {type}}) : relation
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  projectContributions: function () {
    return this.hasMany(ProjectContribution)
  },

  responders: function () {
    return this.belongsToMany(User).through(EventResponse)
  },

  invitees: function () {
    return this.belongsToMany(User).through(EventInvitation)
  },

  userVote: function (userId) {
    return this.votes().query({where: {user_id: userId}}).fetchOne()
  },

  relatedUsers: function () {
    return this.belongsToMany(User, 'posts_about_users')
  },

  tags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
  },

  // should only be one of these per post
  selectedTags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
    .query({where: {selected: true}})
  },

  children: function () {
    return this.hasMany(Post, 'parent_post_id')
    .query({where: {active: true}})
  },

  parent: function () {
    return this.belongsTo(Post, 'parent_post_id')
  },

  activities: function () {
    return this.hasMany(Activity)
  },

  linkPreview: function () {
    return this.belongsTo(LinkPreview)
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

  getType: function () {
    return this.load('tags')
    .then(() => {
      var type = this.get('type')
      if (type) return type
      const tagNames = this.relations.tags.map(t => t.get('name'))
      const typeNames = intersection(tagNames, ['request', 'offer', 'resource'])
      if (!isEmpty(typeNames)) {
        return typeNames[0]
      } else {
        return 'discussion'
      }
    })
  },

  addFollowers: async function (userIds, opts) {
    return this.addGroupMembers(userIds, {settings: {following: true}}, opts)
  },

  removeFollowers: async function (userIds, opts) {
    return this.updateGroupMembers(userIds, {settings: {following: false}}, opts)
  },

  isPublic: function () {
    // return this.get('visibility') === Post.Visibility.PUBLIC_READABLE
    return this.get('is_public')
  },

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  isThread: function () {
    return this.get('type') === Post.Type.THREAD
  },

  unreadCountForUser: function (userId) {
    return this.lastReadAtForUser(userId)
    .then(date => {
      if (date > this.get('updated_at')) return 0
      return Aggregate.count(this.comments().query(q =>
        q.where('created_at', '>', date)))
    })
  },

  async markAsRead (userId) {
    const gm = await GroupMembership.forPair(userId, this).fetch()
    return gm.addSetting({lastReadAt: new Date()}, true)
  },

  async lastReadAtForUser (userId) {
    const user = await this.groupMembersWithPivots()
    .query(q => q.where('users.id', userId)).fetchOne()
    return new Date((user && user.pivot.getSetting('lastReadAt')) || 0)
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
    await this.load(['communities', 'tags'], {transacting: trx})
    const { tags, communities } = this.relations

    const tagFollows = await TagFollow.query(qb => {
      qb.whereIn('tag_id', tags.map('id'))
      qb.whereIn('community_id', communities.map('id'))
    })
    .fetchAll({withRelated: ['tag'], transacting: trx})

    const tagFollowers = tagFollows.map(tagFollow => ({
      reader_id: tagFollow.get('user_id'),
      post_id: this.id,
      actor_id: this.get('user_id'),
      community_id: tagFollow.get('community_id'),
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

    let members = await Promise.all(communities.map(async community => {
      const userIds = await community.users().fetch().then(u => u.pluck('id'))
      const newPosts = userIds.map(userId => ({
        reader_id: userId,
        post_id: this.id,
        actor_id: this.get('user_id'),
        community_id: community.id,
        reason: `newPost: ${community.id}`
      }))

      const isModerator = await GroupMembership.hasModeratorRole(this.get('user_id'), community)
      if (this.get('announcement') && isModerator) {
        const announcees = userIds.map(userId => ({
          reader_id: userId,
          post_id: this.id,
          actor_id: this.get('user_id'),
          community_id: community.id,
          reason: `announcement: ${community.id}`
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

  removeFromCommunity: function (idOrSlug) {
    return PostMembership.find(this.id, idOrSlug)
    .then(membership => membership.destroy())
  },

  // Emulate the graphql request for a post in the feed so the feed can be
  // updated via socket. Some fields omitted, linkPreview for example.
  // TODO: if we were in a position to avoid duplicating the graphql layer
  // here, that'd be grand.
  getNewPostSocketPayload: function () {
    const { communities, linkPreview, tags, user } = this.relations

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
        communities: refineMany(communities, [ 'id', 'name', 'slug' ]),
        creator,
        linkPreview: refineOne(linkPreview, [ 'id', 'image_url', 'title', 'url' ]),
        topics,

        // TODO: Once legacy site is decommissioned, these are no longer required.
        creatorId: creator.id,
        tags: topics
      }
    )
  },

  totalContributions: async function () {
    await this.load('projectContributions')
    return this.relations.projectContributions.models.reduce((total, contribution) => total + contribution.get('amount'), 0)
  }
}, EnsureLoad, HasGroup, ProjectMixin, EventMixin), {
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

  Visibility: {
    DEFAULT: 0,
    PUBLIC_READABLE: 1
  },

  countForUser: function (user, type) {
    const attrs = {user_id: user.id, active: true}
    if (type) attrs.type = type
    return this.query().count().where(attrs).then(rows => rows[0].count)
  },

  groupedCountForUser: function (user) {
    return this.query(q => {
      q.join('posts_tags', 'posts.id', 'posts_tags.post_id')
      q.join('tags', 'tags.id', 'posts_tags.tag_id')
      q.whereIn('tags.name', ['request', 'offer', 'resource'])
      q.groupBy('tags.name')
      q.where({user_id: user.id, active: true})
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

    const pcids = await PostMembership.query()
    .where({post_id: postId}).pluck('community_id')
    const ucids = await Group.pluckIdsForMember(userId, Community)
    if (intersection(pcids, ucids).length > 0) return true
    if (await post.isFollowed(userId)) return true

    const sharesNetwork = await Community.query()
    .whereIn('id', pcids).pluck('network_id')
    .then(networkIds =>
      Promise.map(compact(uniq(networkIds)), id =>
        Network.containsUser(id, userId)))
    .then(results => some(results))

    return sharesNetwork
  },

  find: function (id, options) {
    return Post.where({id, active: true}).fetch(options)
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
    const where = {post_id: postId, active: true}
    const now = new Date()

    return Promise.all([
      Comment.query().where(where).orderBy('created_at', 'desc').limit(2)
      .pluck('id').then(ids => Promise.all([
        Comment.query().where('id', 'in', ids).update('recent', true),
        Comment.query().where('id', 'not in', ids)
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

      // bump updated_at on the post's group
      commentId && Group.whereIdAndType(postId, Post).query()
      .update({updated_at: now}),

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
        Post.where('id', postId).query()
        .update({active: false}).transacting(trx),
        Group.whereIdAndType(postId, Post).query()
        .update({active: false}).transacting(trx)
      )),

  createActivities: (opts) =>
    Post.find(opts.postId).then(post => post &&
      bookshelf.transaction(trx => post.createActivities(trx))),

  fixTypedPosts: () =>
    bookshelf.transaction(transacting =>
      Tag.where('name', 'in', ['request', 'offer', 'resource', 'intention'])
      .fetchAll({transacting})
      .then(tags => Post.query(q => {
        q.where('type', 'in', ['request', 'offer', 'resource', 'intention'])
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

  notifySlack: ({ postId }) =>
    Post.find(postId, {withRelated: ['communities', 'user', 'relatedUsers']})
    .then(post => {
      if (!post) return
      const slackCommunities = post.relations.communities.filter(c => c.get('slack_hook_url'))
      return Promise.map(slackCommunities, c => Community.notifySlack(c.id, post))
    })
})
