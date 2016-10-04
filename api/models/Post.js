/* globals LinkPreview */
import { filter } from 'lodash/fp'
import { flatten } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'post',

  user: function () {
    return this.belongsTo(User)
  },

  communities: function () {
    return this.belongsToMany(Community).through(PostMembership)
    .query({where: {'community.active': true}})
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

  addFollowers: function (userIds, addingUserId, opts) {
    var postId = this.id
    var userId = this.get('user_id')
    if (!opts) opts = {}

    return this.load('communities')
    .then(() => {
      return Promise.map(userIds, followerId =>
        Follow.create(followerId, postId, {
          addedById: addingUserId,
          transacting: opts.transacting
        })
        .tap(follow => {
          if (!opts.createActivity) return

          var updates = []
          const addActivity = (recipientId, method) => {
            updates.push(Activity[method](follow, recipientId)
            .save({}, _.pick(opts, 'transacting'))
            .then(activity => activity.createNotifications(opts.transacting)))
          }
          if (followerId !== addingUserId) addActivity(followerId, 'forFollowAdd')
          if (userId !== addingUserId) addActivity(userId, 'forFollow')
          return Promise.all(updates)
        }))
    })
  },

  removeFollower: function (userId, opts) {
    var self = this
    return Follow.where({user_id: userId, post_id: this.id}).destroy()
      .tap(function () {
        if (!opts.createActivity) return
        return Activity.forUnfollow(self, userId)
        .save()
        .then(activity => activity.createNotifications())
      })
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

  sendToSubscribedSockets: function (messageType, payload, socketToExclude) {
    if (!sails.io) return
    var postId = this.id
    Object.keys(sails.io.sockets.sockets).forEach(function (id) {
      var socket = sails.io.sockets.sockets[id]
      // for security reasons, only sockets that passed the checkAndSetPost policy
      // get subscribed to the comment stream for that post
      if (socket !== socketToExclude && socket.rooms[`posts/${postId}`]) {
        socket.emit(messageType, payload)
      }
    })
    /* this should work but it doesn't
      sails.sockets.broadcast(`posts/${this.id}`, 'comment_added', comment)
    */
  },

  pushCommentToSockets: function (comment) {
    this.sendToSubscribedSockets('commentAdded', comment)
  },

  pushTypingToSockets: function (userId, userName, isTyping, socketToExclude) {
    this.sendToSubscribedSockets('userTyping', { userId, userName, isTyping }, socketToExclude)
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
      .fetchAll({withRelated: ['tag'], transacting: trx}))
    .then(tagFollows => {
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
      const tagFollowers = tagFollows.map(tagFollow => ({
        reader_id: tagFollow.get('user_id'),
        post_id: this.id,
        actor_id: this.get('user_id'),
        community_id: tagFollow.get('community_id'),
        reason: `tag: ${tagFollow.relations.tag.get('name')}`
      }))
      const readers = filter(r => r.reader_id !== this.get('user_id'),
        mentioned.concat(members).concat(tagFollowers))
      return Activity.saveForReasons(readers, trx)
    })
  }

}, {
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
      q.join('posts_tags', 'post.id', 'posts_tags.post_id')
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
    if (!postId) return false
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
    return Post.where({id: id, active: true}).fetch(options).catch(() => null)
  },

  findThread: function (currentUserId, otherUserId, options) {
    return Post.where({active: true, type: Post.Type.THREAD}).fetch(options).catch(() => null)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Post
    }
    return collection.query(function (qb) {
      qb.whereRaw('post.created_at between ? and ?', [startTime, endTime])
      qb.where('post.active', true)
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
      Follow.create(userId, post.id, {transacting: trx})
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

  setRecentComments: opts => {
    const comments = () => bookshelf.knex('comment')
    return comments()
    .where({post_id: opts.postId, active: true})
    .orderBy('created_at', 'desc')
    .pluck('id')
    .then(ids => Promise.all([
      comments().where('id', 'in', ids.slice(0, 3)).update('recent', true),
      ids.length > 3 && comments().where('id', 'in', ids.slice(3)).update('recent', false)
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
