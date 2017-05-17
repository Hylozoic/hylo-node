/* globals LastRead, _ */
/* eslint-disable camelcase */
import { filter, isNull, omitBy, uniqBy, isEmpty, intersection } from 'lodash/fp'
import { flatten } from 'lodash'
import { postRoom, pushToSockets } from '../services/Websockets'
import { addFollowers } from './post/util'
import { fulfillRequest, unfulfillRequest } from './post/request'
import EnsureLoad from './mixins/EnsureLoad'
import { countTotal } from '../../lib/util/knex'

const commentersQuery = (limit, post, currentUserId) => q => {
  q.select('users.*', 'comments.user_id')
  q.join('comments', 'comments.user_id', 'users.id')
  q.where('comments.post_id', '=', post.id)
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

  getTagsInComments: function (opts) {
    // this is part of the 'taggable' interface, shared with Comment
    return this.load('comments.tags', opts)
    .then(() =>
      uniqBy('id', flatten(this.relations.comments.map(c => c.relations.tags.models))))
  },

  getCommenters: function (first, currentUserId) {
    return User.query(commentersQuery(first, this, currentUserId)).fetchAll()
  },

  getCommentersTotal: function () {
    return countTotal(User.query(commentersQuery(null, this)).query(), 'users')
    .then(result => {
      if (isEmpty(result)) {
        return 0
      } else {
        return result[0].total
      }
    })
  },

  getType: function () {
    return this.load('tags')
    .then(() => {
      var type = this.get('type')
      if (type) return type
      const tagNames = this.relations.tags.map(t => t.get('name'))
      const typeNames = intersection(tagNames, ['request', 'offer'])
      if (!isEmpty(typeNames)) {
        return typeNames[0]
      } else {
        return 'discussion'
      }
    })
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

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  isProject: function () {
    return this.get('type') === Post.Type.PROJECT
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

  lastReadAtForUser: function (userId) {
    return this.lastReads().query(q => q.where('user_id', userId)).fetchOne()
    .then(x => x ? x.get('last_read_at') : new Date(0))
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

  unfulfillRequest,

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
  }

}, EnsureLoad), {
  // Class Methods

  Type: {
    WELCOME: 'welcome',
    REQUEST: 'request',
    OFFER: 'offer',
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

  updateFromNewComment: ({ postId, commentId }) => {
    const where = {post_id: postId, active: true}
    const now = new Date()
    const select = (model, id, column) =>
      model.where('id', id).query().select(column)

    return Comment.query()
    .where(where)
    .orderBy('created_at', 'desc')
    .limit(2)
    .pluck('id')
    .then(ids => Promise.all([
      Comment.query().where('id', 'in', ids).update('recent', true),
      Comment.query().where('id', 'not in', ids)
      .where({recent: true, post_id: postId})
      .update('recent', false),

      // update num_comments and updated_at (only update the latter when
      // creating a comment, not deleting one)
      Aggregate.count(Comment.where(where)).then(count =>
        Post.query().where('id', postId).update(omitBy(isNull, {
          num_comments: count,
          updated_at: commentId ? now : null
        }))),

      // when creating a comment, set updated_at in parent post if it exists,
      // and set last_read_at for the commenter
      commentId && Promise.join(
        Post.query().whereIn('id', select(Post, postId, 'parent_post_id'))
        .update({updated_at: now}),

        LastRead.query().where({
          post_id: postId,
          user_id: select(Comment, commentId, 'user_id')
        })
        .update({last_read_at: now})
      )
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
