var url = require('url')

module.exports = bookshelf.Model.extend({
  tableName: 'post',

  creator: function () {
    return this.belongsTo(User)
  },

  communities: function () {
    return this.belongsToMany(Community).through(PostMembership)
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

  media: function () {
    return this.hasMany(Media)
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  projects: function () {
    return this.belongsToMany(Project, 'posts_projects')
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

  addFollowers: function (userIds, addingUserId, opts) {
    var postId = this.id
    var userId = this.get('user_id')
    if (!opts) opts = {}

    return Promise.map(userIds, function (followerUserId) {
      return Follow.create(postId, {
        followerId: followerUserId,
        addedById: addingUserId,
        transacting: opts.transacting
      }).tap(function (follow) {
        if (!opts.createActivity) return

        var updates = []
        if (followerUserId !== addingUserId) {
          updates.push(Activity.forFollowAdd(follow, followerUserId).save({}, _.pick(opts, 'transacting')))
          updates.push(User.incNewNotificationCount(followerUserId, opts.transacting))
        }
        if (userId !== addingUserId) {
          updates.push(Activity.forFollow(follow, userId).save({}, _.pick(opts, 'transacting')))
          updates.push(User.incNewNotificationCount(userId, opts.transacting))
        }
        return Promise.all(updates)
      })
    })
  },

  removeFollower: function (userId, opts) {
    var self = this
    return Follow.where({user_id: userId, post_id: this.id}).destroy()
      .tap(function () {
        if (!opts.createActivity) return
        return Activity.forUnfollow(self, userId).save()
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

  copy: function (attrs) {
    var that = this.clone()
    _.merge(that.attributes, Post.newPostAttrs(), attrs)
    delete that.id
    delete that.attributes.id
    that._previousAttributes = {}
    that.changed = {}
    return that
  }

}, {
  Type: {
    REQUEST: 'request',
    OFFER: 'offer',
    INTENTION: 'intention',
    WELCOME: 'welcome',
    EVENT: 'event'
  },

  Visibility: {
    DEFAULT: 0,
    PUBLIC_READABLE: 1,
    DRAFT_PROJECT: 2
  },

  countForUser: function (user) {
    return this.query().count().where({user_id: user.id, active: true})
      .then(function (rows) {
        return rows[0].count
      })
  },

  isVisibleToUser: function (postId, userId) {
    var pcids

    // do the user and post share...
    return Promise.join(
      PostMembership.query().where({post_id: postId}),
      Membership.query().where({user_id: userId})
    )
    .spread((postMships, userMships) => {
      // a community?
      pcids = postMships.map(m => m.community_id)
      return _.intersection(pcids, userMships.map(m => m.community_id)).length > 0
    })
    .then(success =>
      // or a project?
      success || PostProjectMembership.where({post_id: postId}).fetch()
      .then(ppm => ppm && Project.isVisibleToUser(ppm.get('project_id'), userId)))
    .then(success =>
      // or a network?
      success || Community.query().whereIn('id', pcids).pluck('network_id')
      .then(networkIds =>
        Promise.map(_.compact(_.uniq(networkIds)), id =>
          Network.containsUser(id, userId)))
      .then(results => _.any(results)))
  },

  find: function (id, options) {
    return Post.where({id: id}).fetch(options).catch(() => null)
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
      qb.where('visibility', '!=', Post.Visibility.DRAFT_PROJECT)
    })
  },

  sendNotificationEmail: function (opts) {
    return Promise.join(
      User.find(opts.recipientId),
      Post.find(opts.postId, {withRelated: ['communities', 'creator']})
    )
    .spread(function (recipient, post) {
      var creator = post.relations.creator
      var community = post.relations.communities.first()
      var description = RichText.qualifyLinks(post.get('description'))
      var replyTo = Email.postReplyAddress(post.id, recipient.id)

      return recipient.generateToken()
      .then(token => Email.sendPostMentionNotification({
        email: recipient.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', creator.get('name'))
        },
        data: {
          community_name: community.get('name'),
          creator_name: creator.get('name'),
          creator_avatar_url: Frontend.Route.tokenLogin(recipient, token,
            creator.get('avatar_url') + '?ctt=post_mention_email'),
          creator_profile_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.profile(creator) + '?ctt=post_mention_email'),
          post_description: description,
          post_title: post.get('name'),
          post_type: post.get('type'),
          post_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.post(post, community) + '?ctt=post_mention_email'),
          unfollow_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.unfollow(post, community) + '?ctt=post_mention_email'),
          tracking_pixel_url: Analytics.pixelUrl('Mention in Post', {userId: recipient.id})
        }
      }))
    })
  },

  sendPushNotifications: function (opts) {
    var uniqById = function (array) {
      // this is destructive of array
      var result = []
      while (array.length > 0) {
        var element = array[0]
        result.push(element)
        _.remove(array, item => item.get('id') === element.get('id'))
      }
      return result
    }

    return Post.find(opts.postId, {withRelated: ['communities', 'communities.users', 'communities.users.communities', 'creator']})
      .then(post => {
        var communities = post.relations.communities
        var creator = post.relations.creator
        var usersWithDupes = communities.map(community => community.relations.users.models)
        var users = uniqById(_.flatten(usersWithDupes))

        _.remove(users, user => user.get('id') === creator.get('id'))
        return Promise.map(users, (user) => {
          if (!user.get('push_new_post_preference')) return
          if (post.isWelcome()) return
          var userCommunities = user.relations.communities.models
          var postCommunitiesIds = communities.models.map(community => community.get('id'))
          var community, path, alertText
          community = _.find(userCommunities, community => _.contains(postCommunitiesIds, community.get('id')))
          if (!community) return
          path = url.parse(Frontend.Route.post(post, community)).path
          alertText = PushNotification.textForNewPost(post, community, user.get('id'))
          return user.sendPushNotification(alertText, path)
        })
      })
  },

  notifyAboutMention: function (post, userId, opts) {
    return Promise.join(
      Queue.classMethod('Post', 'sendNotificationEmail', {
        recipientId: userId,
        postId: post.id
      }),
      Activity.forPost(post, userId).save(null, _.pick(opts, 'transacting')),
      User.incNewNotificationCount(userId, opts.transacting)
    )
  },

  createWelcomePost: function (userId, communityId, trx) {
    var attrs = _.merge(Post.newPostAttrs(), {
      type: 'welcome'
    })

    return new Post(attrs).save({}, {transacting: trx})
      .tap(post => Promise.join(
          post.relatedUsers().attach(userId, {transacting: trx}),
          post.communities().attach(communityId, {transacting: trx}),
          Follow.create(post.id, {followerId: userId, transacting: trx})
      ))
  },

  newPostAttrs: () => ({
    created_at: new Date(),
    updated_at: new Date(),
    active: true,
    num_comments: 0,
    num_votes: 0,
    edited: false
  })

})
