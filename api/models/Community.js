var Slack = require('../services/Slack')
const randomstring = require('randomstring')
import { merge, unset, differenceBy } from 'lodash'

const defaultBanner = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg'
const defaultAvatar = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png'

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

  tagFollows: function () {
    return this.hasMany(TagFollow)
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

  tags: function () {
    return this.belongsToMany(Tag).through(CommunityTag).withPivot(['user_id', 'description'])
  },

  comments: function () {
    var communityId = this.id
    return Comment.collection().query(q => {
      q.where({
        'post_community.community_id': communityId,
        'comment.active': true
      })
      q.join('post_community', 'post_community.post_id', 'comment.post_id')
    })
  },

  createStarterPosts: function (transacting) {
    var now = new Date()
    var timeShift = {null: 0, intention: 1, offer: 2, request: 3}
    return Community.find('starter-posts', {withRelated: [
      'posts', 'posts.followers', 'posts.selectedTags'
    ]})
    .tap(c => {
      if (!c) throw new Error('Starter posts community not found')
    })
    .then(c => c.relations.posts.models)
    .then(posts => Promise.map(posts, post => {
      if (post.get('type') === 'welcome') return
      const tag = post.relations.selectedTags.first()
      const tagName = tag ? tag.get('name') : null

      var newPost = post.copy()
      var time = new Date(now - timeShift[tagName] * 1000)
      return newPost.save({created_at: time, updated_at: time}, {transacting})
      .then(() => Promise.all(_.flatten([
        this.posts().attach(newPost, {transacting}),
        tagName && Tag.find(tagName).then(tag =>
          newPost.tags().attach({tag_id: tag.id, selected: true}, {transacting})),
        post.relations.followers.map(u =>
          Follow.create(u.id, newPost.id, {transacting}))
      ])))
    }))
  },

  createStarterTags: function (userId, trx) {
    return Tag.starterTags(trx).then(tags =>
      Promise.map(tags.models, tag => new CommunityTag({
        community_id: this.id,
        is_default: true,
        tag_id: tag.id,
        user_id: userId,
        created_at: new Date()
      })
      .save({}, {transacting: trx})))
  },

  addSetting: function (value) {
    return this.set('settings', merge({}, this.get('settings'), value))
  },

  removeSetting: function (path) {
    return unset(this.get('settings'), path)
  },

  updateChecklist: function () {
    return this.load(['posts', 'invitations', 'tags', 'leader', 'tags'])
    .then(() => Tag.starterTags())
    .then(starterTags => {
      const { invitations, posts, leader, tags } = this.relations

      console.log('tags.models', tags.models)
      console.log('starterTags.models', starterTags.models)
      console.log('difference', differenceBy(tags.models, starterTags.models, 'id'))
      console.log('leader', leader)
      console.log('find', differenceBy(tags.models, starterTags.models, 'id').find(t => t.pivot.get('user_id') === leader.id))

      this.addSetting({
        checklist: {
          logo: this.get('avatar_url') !== defaultAvatar,
          invite: invitations.length > 0,
          topics: !!differenceBy(tags.models, starterTags.models, 'id')
            .find(t => t.pivot.get('user_id') === leader.id),
          post: !!posts.find(p => p.get('user_id') === leader.id)
        }
      })
      return this.save()
    })
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

  notifySlack: function (communityId, post) {
    return Community.find(communityId)
    .then(community => {
      if (!community || !community.get('slack_hook_url')) return
      var slackMessage = Slack.textForNewPost(post, community)
      return Slack.send(slackMessage, community.get('slack_hook_url'))
    })
  },

  getNewBetaAccessCode: function () {
    const test = code => Community.where({beta_access_code: code}).count().then(Number)
    const loop = () => {
      const code = randomstring.generate({length: 6, charset: 'alphanumeric'})
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  }
})
