/* globals NexudusAccount */
var Slack = require('../services/Slack')
import randomstring from 'randomstring'
import HasSettings from './mixins/HasSettings'
import { flatten, isEqual, merge, differenceBy, pick, clone } from 'lodash'
import { applyPagination } from '../../lib/graphql-bookshelf-bridge/util'

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
      .query({where: {role: Membership.MODERATOR_ROLE, 'communities_users.active': true}})
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

  communityTags: function () {
    return this.hasMany(CommunityTag)
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

  skills: function () {
    return Skill.collection().query(q => {
      q.where({
        'communities_users.community_id': this.id,
        'communities_users.active': true
      })
      q.join('skills_users', 'skills_users.skill_id', 'skills.id')
      q.join('communities_users', 'communities_users.user_id', 'skills_users.user_id')
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
      .then(() => Promise.all(flatten([
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
    const { checklist } = this.get('settings') || {}
    const completed = {
      logo: true, banner: true, invite: true, topics: true, post: true
    }
    if (isEqual(checklist, completed)) return Promise.resolve(this)

    return this.load([
      {posts: q => q.limit(2)},
      {tags: q => q.limit(4)},
      {invitations: q => q.limit(1)}
    ])
    .then(() => Tag.starterTags())
    .then(starterTags => {
      const { invitations, posts, tags } = this.relations

      const updatedChecklist = {
        logo: this.get('avatar_url') !== defaultAvatar,
        banner: this.get('banner_url') !== defaultBanner,
        invite: invitations.length > 0,
        topics: differenceBy(tags.models, starterTags.models, 'id').length > 0,
        post: !!posts.find(p => p.get('user_id') !== axolotlId)
      }

      return isEqual(checklist, updatedChecklist)
        ? Promise.resolve(this)
        : this.addSetting({checklist: updatedChecklist}, true)
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
  },

  feedItems: function ({ first, cursor, order }) {
    return this.posts().query(q => {
      applyPagination(q, 'posts', { first, cursor, order })
    }).fetch().then(posts =>
      posts.map(p => createFeedItem({post: p})))
  },

  update: function (changes) {
    var whitelist = [
      'banner_url', 'avatar_url', 'name', 'description', 'settings',
      'welcome_message', 'leader_id', 'beta_access_code', 'location',
      'slack_hook_url', 'slack_team', 'slack_configure_url', 'active'
    ]

    const attributes = pick(changes, whitelist)
    const saneAttrs = clone(attributes)

    if (attributes.settings) {
      saneAttrs.settings = merge({}, this.get('settings'), attributes.settings)
    }
    return this.save(saneAttrs, {patch: true})
    .then(() => this)
  },

  reconcileNumMembers: function () {
    return Membership.where({community_id: this.id, active: true})
    .fetchAll()
    .then(memberships => this.save({num_members: memberships.length}))
  }

}, HasSettings), {
  find: function (key, opts = {}) {
    if (!key) return Promise.resolve(null)

    let where = isNaN(Number(key))
      ? (opts.active ? {slug: key, active: true} : {slug: key})
      : (opts.active ? {id: key, active: true} : {id: key})
    return this.where(where).fetch(opts)
  },

  findActive: function (key, opts = {}) {
    return this.find(key, merge({active: true}, opts))
  },

  canInvite: function (userId, communityId) {
    return Community.find(communityId).then(function (community) {
      if (!community) return false
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
    return Community.query().where('id', communityId).pluck('network_id')
    .then(([ networkId ]) =>
      networkId && Network.containsUser(networkId, userId))
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
      const code = randomstring.generate({length: 10, charset: 'alphanumeric'})
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  },

  create: function (userId, data) {
    var attrs = pick(data,
      'name', 'description', 'slug', 'category',
      'beta_access_code', 'banner_url', 'avatar_url', 'location')

    var promise = attrs.beta_access_code
      ? Promise.resolve(attrs.beta_access_code)
      : Community.getNewAccessCode()

    return promise
    .then(beta_access_code => { // eslint-disable-line
      var community = new Community(merge(attrs, {
        beta_access_code,
        created_at: new Date(),
        created_by_id: userId,
        leader_id: userId,
        settings: {post_prompt_day: 0}
      }))

      return bookshelf.transaction(trx => {
        return community.save(null, {transacting: trx})
        .tap(community => community.createStarterTags(userId, trx))
        .tap(community => community.createStarterPosts(trx))
        .then(() => Membership.create(userId, community.id, {
          role: Membership.MODERATOR_ROLE,
          transacting: trx
        }))
        .then(membership => ({ membership, community }))
      })
      // Any assets were uploaded to /community/new, since we didn't have an id;
      // copy them over to /community/:id now
      .tap(() => Queue.classMethod('Community', 'copyAssets', {communityId: community.id}))
      .tap(() => Queue.classMethod('Community', 'notifyAboutCreate', {communityId: community.id}))
    })
  }
})

function createFeedItem ({ post }) {
  return {
    type: 'post',
    content: post
  }
}
