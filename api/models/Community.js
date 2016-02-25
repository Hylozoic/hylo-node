var Slack = require('../services/Slack')

module.exports = bookshelf.Model.extend({
  tableName: 'community',

  creator: function () {
    return this.belongsTo(User, 'created_by_id')
  },

  inactiveUsers: function () {
    return this.belongsToMany(User, 'users_community', 'community_id', 'user_id')
      .query({where: {'users_community.active': false}})
  },

  invitations: function () {
    return this.hasMany(Invitation)
  },

  leader: function () {
    return this.belongsTo(User, 'leader_id')
  },

  memberships: function () {
    return this.hasMany(Membership).query({where: {'users_community.active': true}})
  },

  moderators: function () {
    return this.belongsToMany(User, 'users_community', 'community_id', 'user_id')
      .query({where: {role: Membership.MODERATOR_ROLE}})
  },

  network: function () {
    return this.belongsTo(Network)
  },

  users: function () {
    return this.belongsToMany(User).through(Membership)
      .query({where: {'users_community.active': true, 'users.active': true}}).withPivot('role')
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostMembership)
      .query({where: {'post.active': true}})
  },

  comments: function () {
    // FIXME get this to use the model relation API
    // instead of the Collection API so that the use
    // of fetch vs. fetchAll isn't confusing.
    // as it is now, it uses "fetchAll" when all the
    // other relations use "fetch"
    var communityId = this.id
    return Comment.query(function (qb) {
      qb.where({
        'post_community.community_id': communityId,
        'comment.active': true
      }).leftJoin('post_community', function () {
        this.on('post_community.post_id', 'comment.post_id')
      })
    })
  },

  createStarterPosts: function (trx) {
    var self = this
    var now = new Date()
    var timeShift = {
      chat: 0,
      intention: 1,
      offer: 2,
      request: 3
    }
    return Community.find('starter-posts', {withRelated: ['posts', 'posts.followers']})
    .tap(c => {
      if (!c) throw new Error('Starter posts community not found')
    })
    .then(c => c.relations.posts.models)
    .then(posts => Promise.map(posts, post => {
      if (post.get('type') === 'welcome') return

      var newPost = post.copy()
      var time = new Date(now - timeShift[newPost.get('type')] * 1000)
      return newPost.save({created_at: time, updated_at: time}, {transacting: trx})
      .then(() => Promise.all(_.flatten([
        self.posts().attach(newPost, {transacting: trx}),
        post.relations.followers.map(u =>
          Follow.create(u.id, newPost.id, {transacting: trx}))
      ])))
    }))
  }

}, {
  find: function (id_or_slug, options) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug}).fetch(options)
    }
    return Community.where({id: id_or_slug}).fetch(options)
  },

  findActive: function (id_or_slug, options) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug, active: true}).fetch(options)
    }
    return Community.where({id: id_or_slug, active: true}).fetch(options)
  },

  canInvite: function (userId, communityId) {
    return Community.find(communityId).then(function (community) {
      if (community.get('settings').all_can_invite) return true
      return Membership.hasModeratorRole(userId, communityId)
    })
  },

  copyAssets: function (opts) {
    return Community.find(opts.communityId).then(c => Promise.join(
        AssetManagement.copyAsset(c, 'community', 'avatar_url'),
        AssetManagement.copyAsset(c, 'community', 'banner_url')
    ))
  },

  notifyAboutCreate: function (opts) {
    return Community.find(opts.communityId, {withRelated: ['creator']}).then(c => {
      var creator = c.relations.creator
      var recipient = process.env.ASANA_NEW_COMMUNITIES_EMAIL
      Email.sendRawEmail(recipient, {
        subject: c.get('name'),
        body: format(
          '%s<br/>created by %s<br/>%s<br/>%s',
          Frontend.Route.community(c),
          creator.get('name'),
          creator.get('email'),
          Frontend.Route.profile(creator))
      }, {
        sender: {
          name: 'Hylobot',
          address: 'dev+bot@hylo.com'
        }
      })
    })
  },

  inNetworkWithUser: function (communityId, userId) {
    return Community.find(communityId)
    .then(community => community && community.get('network_id'))
    .then(networkId => networkId && Network.containsUser(networkId, userId))
  },

  sendSlackNotification: function (communityId, post) {
    return Community.find(communityId)
    .then(community => {
      if (!community || !community.get('slack_hook_url')) return
      var slackMessage = Slack.textForNewPost(post, community)
      return Slack.send(slackMessage, community.get('slack_hook_url'))
    })
  }
})
