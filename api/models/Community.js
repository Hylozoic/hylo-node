/* globals NexudusAccount */
var Slack = require('../services/Slack')
import randomstring from 'randomstring'
import HasSettings from './mixins/HasSettings'
import { merge, differenceBy } from 'lodash'

const defaultBanner = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg'
const defaultAvatar = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png'
const axolotlId = '13986'

module.exports = bookshelf.Model.extend(merge({
  tableName: 'communities',

  creator: function () {
    return this.belongsTo(User, 'created_by_id')
  },

  inactiveUsers: function () {
    return this.belongsToMany(User, 'communities_users', 'community_id', 'user_id')
      .query({where: {'communities_users.active': false}})
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
    return this.hasMany(Membership).query({where: {'communities_users.active': true}})
  },

  moderators: function () {
    return this.belongsToMany(User, 'communities_users', 'community_id', 'user_id')
      .query({where: {role: Membership.MODERATOR_ROLE}})
  },

  network: function () {
    return this.belongsTo(Network)
  },

  users: function () {
    return this.belongsToMany(User).through(Membership)
      .query({where: {'communities_users.active': true, 'users.active': true}}).withPivot('role')
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostMembership)
      .query({where: {'posts.active': true}})
  },

  tags: function () {
    return this.belongsToMany(Tag).through(CommunityTag).withPivot(['user_id', 'description'])
  },

  comments: function () {
    var communityId = this.id
    return Comment.collection().query(q => {
      q.where({
        'communities_posts.community_id': communityId,
        'comments.active': true
      })
      q.join('communities_posts', 'communities_posts.post_id', 'comments.post_id')
    })
  },

  nexudusAccounts: function () {
    this.hasMany(NexudusAccount)
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
          Follow.create(u.id, newPost.id, null, {transacting}))
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

  updateChecklist: function () {
    return this.load(['posts', 'invitations', 'tags'])
    .then(() => Tag.starterTags())
    .then(starterTags => {
      const { invitations, posts, tags } = this.relations

      this.addSetting({
        checklist: {
          logo: this.get('avatar_url') !== defaultAvatar,
          banner: this.get('banner_url') !== defaultBanner,
          invite: invitations.length > 0,
          topics: differenceBy(tags.models, starterTags.models, 'id').length > 0,
          post: !!posts.find(p => p.get('user_id') !== axolotlId)
        }
      })
      return this.save()
    })
  },

  popularSkills: function (limit = 15) {
    return Tag.query(q => {
      q.select(bookshelf.knex.raw('tags.name, count(*)'))
      q.join('tags_users', 'tags.id', 'tags_users.tag_id')
      q.join('communities_users', 'tags_users.user_id', 'communities_users.user_id')
      q.where('communities_users.community_id', this.id)
      q.where('communities_users.active', true)
      q.groupBy('tags.name')
      q.orderBy('count', 'desc')
      q.limit(limit)
    })
    .fetchAll()
    .then(skills => skills.pluck('name'))
  },

  memberCount: function () {
    return User.query(q => {
      q.select(bookshelf.knex.raw('count(*)'))
      q.join('communities_users', 'users.id', 'communities_users.user_id')
      q.where({'communities_users.community_id': this.id, 'communities_users.active': true})
    })
    .fetch()
    .then(result => result.get('count'))
  },

  postCount: function () {
    return Post.query(q => {
      q.select(bookshelf.knex.raw('count(*)'))
      q.join('communities_posts', 'posts.id', 'communities_posts.post_id')
      q.where({'communities_posts.community_id': this.id, 'active': true})
    })
    .fetch()
    .then(result => result.get('count'))
  }

}, HasSettings), {
  find: function (id_or_slug, opts = {}) {
    if (!id_or_slug) return Promise.resolve(null)

    let where = isNaN(Number(id_or_slug))
      ? (opts.active ? {slug: id_or_slug, active: true} : {slug: id_or_slug})
      : (opts.active ? {id: id_or_slug, active: true} : {id: id_or_slug})
    return this.where(where).fetch(opts)
  },

  findActive: function (id_or_slug, opts = {}) {
    return this.find(id_or_slug, merge({active: true}, opts))
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
    return Community.find(opts.communityId, {withRelated: ['creator']})
    .then(c => {
      var creator = c.relations.creator
      var recipient = process.env.ASANA_NEW_COMMUNITIES_EMAIL
      return Email.sendRawEmail(recipient, {
        subject: c.get('name'),
        body: `Community
          ${c.get('name')}
          Email
          ${creator.get('email')}
          First Name
          ${creator.get('name').split(' ')[0]}
          Last Name
          ${creator.get('name').split(' ').slice(1).join(' ')}
          Community URL
          ${Frontend.Route.community(c)}
          Creator URL
          ${Frontend.Route.profile(creator)}
        `.replace(/^\s+/gm, '').replace(/\n/g, '<br/>\n')
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

  getNewAccessCode: function () {
    const test = code => Community.where({beta_access_code: code}).count().then(Number)
    const loop = () => {
      const code = randomstring.generate({length: 20, charset: 'alphanumeric'})
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  }
})
