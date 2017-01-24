/* globals LinkPreview, LastRead */
/* eslint-disable camelcase */
import { filter } from 'lodash/fp'
import { flatten } from 'lodash'
import { normalizePost } from '../../lib/util/normalize'
import { pushToSockets } from '../services/Websockets'
import { addFollowers } from './post/util'
import { fulfillRequest, unfulfillRequest } from './post/request'

const normalize = post => {
  const data = {communities: [], people: []}
  normalizePost(post, data, true)
  return Object.assign(data, post)
}

module.exports = bookshelf.Model.extend({
  // Instance Methods

  tableName: 'posts',

  user: function () {
    return this.belongsTo(User)
  },

  communities: function () {
    return this.belongsToMany(Community).through(PostMembership)
    .query({where: {'communities.active': true}})
  },

  followers: function () {
    return this.belongsToMany(User).through(Follow).withPivot('added_by_id')
  },

  contributions: function () {
    return this.hasMany(Contribution, 'post_id')
  },

  comments: function () {
    return this.hasMany(Comment, 'post_id').query({where: {active: true}})
  },

  lastReads: function () {
    return this.hasMany(LastRead)
  },

  media: function () {
    return this.hasMany(Media)
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  responders: function () {
    return this.belongsToMany(User).through(EventResponse)
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

  addFollowers: function (userIds, addedById, opts = {}) {
    return addFollowers(this, null, userIds, addedById, opts)
  },

  removeFollower: function (user_id, opts = {}) {
    return Follow.where({user_id, post_id: this.id}).destroy()
    .tap(() => this.isProject() && this.load(['selectedTags', 'communities'])
      .then(() => {
        const tag = this.relations.selectedTags.first()
        if (!tag) return
        return Promise.each(this.relations.communities.models, community =>
          TagFollow.remove(tag, user_id, community))
      }))
    .tap(() => opts.createActivity && Activity.forUnfollow(this, user_id).save()
      .then(activity => activity.createNotifications()))
  },

  isPublic: function () {
    return this.get('visibility') === Post.Visibility.PUBLIC_READABLE
  },

  updateCommentCount: function (trx) {
    var self = this
    return Aggregate.count(this.comments(), {transacting: trx})
    .tap(count => self.save({
      num_comments: count,
      updated_at: new Date()
    }, {patch: true, transacting: trx}))
  },

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  isProject: function () {
    return this.get('type') === Post.Type.PROJECT
  },

  isThread: function () {
    return this.get('type') === Post.Type.THREAD
  },

  pushCommentToSockets: function (comment) {
    var postId = this.id
    const parent_post_id = this.get('parent_post_id')
    return pushToSockets(`posts/${postId}`, 'commentAdded', {comment, parent_post_id})
  },

  pushMessageToSockets: function (message, userIds) {
    var postId = this.id
    const excludingSender = userIds.filter(id => id !== message.user_id.toString())
    if (this.get('num_comments') === 1) {
      return Promise.map(excludingSender, id => this.pushSelfToSocket(id))
    } else {
      return Promise.map(excludingSender, id =>
        pushToSockets(`users/${id}`, 'messageAdded', {postId, message}))
    }
  },

  pushTypingToSockets: function (userId, userName, isTyping, socketToExclude) {
    var postId = this.id
    pushToSockets(`posts/${postId}`, 'userTyping', {userId, userName, isTyping}, socketToExclude)
  },

  pushSelfToSocket: function (userId) {
    const opts = {withComments: 'all'}
    return this.load(PostPresenter.relations(userId, opts))
    .then(post => PostPresenter.present(post, userId, opts))
    .then(normalize)
    .then(post => pushToSockets(`users/${userId}`, 'newThread', post))
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

  createActivities: function (trx) {
    return this.load(['communities', 'communities.users', 'tags'], {transacting: trx})
    .then(() =>
      TagFollow.query(qb => {
        qb.whereIn('tag_id', this.relations.tags.map('id'))
        qb.whereIn('community_id', this.relations.communities.map('id'))
      })
      .fetchAll({withRelated: ['tag'], transacting: trx})
    )
    .then(tagFollows => {
      const tagFollowers = tagFollows.map(tagFollow => ({
        reader_id: tagFollow.get('user_id'),
        post_id: this.id,
        actor_id: this.get('user_id'),
        community_id: tagFollow.get('community_id'),
        reason: `tag: ${tagFollow.relations.tag.get('name')}`
      }))
      const mentioned = RichText.getUserMentions(this.get('description')).map(userId => ({
        reader_id: userId,
        post_id: this.id,
        actor_id: this.get('user_id'),
        reason: 'mention'
      }))
      const members = flatten(this.relations.communities.map(community =>
        community.relations.users.map(user => ({
          reader_id: user.id,
          post_id: this.id,
          actor_id: this.get('user_id'),
          community_id: community.id,
          reason: `newPost: ${community.id}`
        }))))
      const readers = filter(r => r.reader_id !== this.get('user_id'),
        mentioned.concat(members).concat(tagFollowers))
      return Activity.saveForReasons(readers, trx)
    })
  },

  fulfillRequest,

  unfulfillRequest

}, {
  // Class Methods

  Type: {
    WELCOME: 'welcome',
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
      q.whereIn('tags.name', ['request', 'offer'])
      q.groupBy('tags.name')
      q.where({user_id: user.id, active: true})
      q.select('tags.name')
    }).query().count()
    .then(rows => rows.reduce((m, n) => {
      m[n.name] = n.count
      return m
    }, {}))
  },

  isVisibleToUser: function (postId, userId) {
    if (!postId || !userId) return Promise.resolve(false)
    var pcids

    return Post.find(postId)
    // is the post public?
    .then(post => post.isPublic() ||
      Post.isVisibleToUser(post.get('parent_post_id'), userId))
    .then(success =>
      // or is the user:
      success || Promise.join(
        PostMembership.query().where({post_id: postId}),
        Membership.query().where({user_id: userId, active: true})
      )
      .spread((postMships, userMships) => {
        // in one of the post's communities?
        pcids = postMships.map(m => m.community_id)
        return _.intersection(pcids, userMships.map(m => m.community_id)).length > 0
      }))
    .then(success =>
      // or following the post?
      success || Follow.exists(userId, postId))
    .then(success =>
      // or in one of the post's communities' networks?
      success || Community.query().whereIn('id', pcids).pluck('network_id')
      .then(networkIds =>
        Promise.map(_.compact(_.uniq(networkIds)), id =>
          Network.containsUser(id, userId)))
      .then(results => _.some(results)))
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

  createWelcomePost: function (userId, communityId, trx) {
    var attrs = _.merge(Post.newPostAttrs(), {
      type: 'welcome'
    })

    return new Post(attrs).save({}, {transacting: trx})
    .tap(post => Promise.join(
      post.relatedUsers().attach(userId, {transacting: trx}),
      post.communities().attach(communityId, {transacting: trx}),
      Follow.create(userId, post.id, null, {transacting: trx})
    ))
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

  updateFromNewComment: opts => {
    const comments = () => bookshelf.knex('comments')
    const { postId } = opts
    return comments()
    .where({post_id: postId, active: true})
    .orderBy('created_at', 'desc')
    .limit(3)
    .pluck('id')
    .then(ids => Promise.all([
      comments().where('id', 'in', ids).update('recent', true),
      comments().where('id', 'not in', ids)
      .where({recent: true, post_id: opts.postId})
      .update('recent', false),
      // update 'updated_at' in the parent project of a commented request
      Post.query().whereIn('id', bookshelf.knex('posts').where({id: postId}).select('parent_post_id'))
      .update({updated_at: new Date()})
    ]))
  },

  deactivate: postId =>
    bookshelf.transaction(trx =>
      Promise.join(
        Activity.removeForPost(postId, trx),
        Post.where('id', postId).query().update({active: false}).transacting(trx)
      )),

  createActivities: (opts) =>
    Post.find(opts.postId).then(post =>
      bookshelf.transaction(trx => post.createActivities(trx))),

  fixTypedPosts: () =>
    bookshelf.transaction(transacting =>
      Tag.where('name', 'in', ['request', 'offer', 'intention'])
      .fetchAll({transacting})
      .then(tags => Post.query(q => {
        q.where('type', 'in', ['request', 'offer', 'intention'])
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
      const slackCommunities = post.relations.communities.filter(c => c.get('slack_hook_url'))
      return Promise.map(slackCommunities, c => Community.notifySlack(c.id, post))
    })
})
