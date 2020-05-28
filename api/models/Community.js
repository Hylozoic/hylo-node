/* globals NexudusAccount */
import Slack from '../services/Slack'
import randomstring from 'randomstring'
import HasSettings from './mixins/HasSettings'
import HasGroup from './mixins/HasGroup'
import { clone, flatten, isEqual, merge, pick, trim, defaults } from 'lodash'
import { applyPagination } from '../../lib/graphql-bookshelf-bridge/util'
import { COMMUNITY_AVATAR, COMMUNITY_BANNER } from '../../lib/uploader/types'

const DEFAULT_BANNER = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg'
const DEFAULT_AVATAR = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png'

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

  locationObject: function () {
    return this.belongsTo(Location, 'location_id')
  },

  tagFollows: function () {
    return this.hasMany(TagFollow)
  },

  moderators: function () {
    return this.groupMembers({role: GroupMembership.Role.MODERATOR})
  },

  network: function () {
    return this.belongsTo(Network)
  },

  users: function () {
    return this.groupMembersWithPivots()
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
    var timeShift = {offer: 1, request: 2, resource: 1}
    return Community.find('starter-posts', {withRelated: ['posts']})
    .tap(c => {
      if (!c) throw new Error('Starter posts community not found')
    })
    .then(c => c.relations.posts.models)
    .then(posts => Promise.map(posts, post => {
      if (post.get('type') === 'welcome') return

      var newPost = post.copy()
      var time = new Date(now - (timeShift[post.get('type')] || 0) * 1000)
      return newPost.save({created_at: time, updated_at: time}, {transacting})
      .then(() => Promise.all(flatten([
        this.posts().attach(newPost, {transacting}),
        post.followers().fetch().then(followers =>
          newPost.addFollowers(followers.map(f => f.id), {transacting}))
      ])))
    }))
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
    .then(() => {
      const { invitations, posts, tags } = this.relations

      const updatedChecklist = {
        logo: this.get('avatar_url') !== DEFAULT_AVATAR,
        banner: this.get('banner_url') !== DEFAULT_BANNER,
        invite: invitations.length > 0,
        topics: tags.length > 0,
        post: !!posts.find(p => p.get('user_id') !== User.AXOLOTL_ID)
      }

      return isEqual(checklist, updatedChecklist)
        ? Promise.resolve(this)
        : this.addSetting({checklist: updatedChecklist}, true)
    })
  },

  memberCount: function () {
    return this.get('num_members')
  },

  addMembers: async function (userIds, opts) {
    return this.addGroupMembers(userIds, {}, opts)
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
      'welcome_message', 'leader_id', 'beta_access_code', 'location', 'location_id',
      'slack_hook_url', 'slack_team', 'slack_configure_url', 'active'
    ]

    const attributes = pick(changes, whitelist)
    const saneAttrs = clone(attributes)

    if (attributes.settings) {
      saneAttrs.settings = merge({}, this.get('settings'), attributes.settings)
    }

    this.set(saneAttrs)
    return this.validate().then(() => this.save())
  },

  updateHidden: function (hidden) {
    return this.save({hidden})
  },

  validate: function () {
    if (!trim(this.get('name'))) {
      return Promise.reject(new Error('Name cannot be blank'))
    }

    return Promise.resolve()
  },

  reconcileNumMembers: async function () {
    // FIXME this is not ideal, but the simple `.count()` methods don't work
    // here because of the where clauses on join tables in `this.users`
    const count = await this.users().fetch().then(x => x.length)
    return this.save({num_members: count}, {patch: true})
  }

}, HasSettings, HasGroup), {
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

  queryByAccessCode: function (accessCode) {
    return this.query(qb => {
      qb.whereRaw('lower(beta_access_code) = lower(?)', accessCode)
      qb.where('active', true)
    })
  },

  copyAssets: function (opts) {
    return Community.find(opts.communityId).then(c => Promise.join(
      AssetManagement.copyAsset(c, COMMUNITY_AVATAR, 'avatar_url'),
      AssetManagement.copyAsset(c, COMMUNITY_BANNER, 'banner_url')
    ))
  },

  deactivate: function (communityId) {
    return bookshelf.transaction(trx =>
      Promise.join(
        Community.where('id', communityId).query()
        .update({active: false}).transacting(trx),
        Group.deactivate(communityId, Community, {transacting: trx})
      )
    )
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

  async create (userId, data) {
    var attrs = defaults(
      pick(data,
        'name', 'description', 'slug', 'category',
        'beta_access_code', 'banner_url', 'avatar_url', 'location_id', 'location', 'network_id'),
      {'banner_url': DEFAULT_BANNER, 'avatar_url': DEFAULT_AVATAR})

    // eslint-disable-next-line camelcase
    const beta_access_code = attrs.beta_access_code ||
      await Community.getNewAccessCode()

    const community = new Community(merge(attrs, {
      beta_access_code,
      created_at: new Date(),
      created_by_id: userId,
      settings: {post_prompt_day: 0}
    }))

    const memberships = await bookshelf.transaction(async trx => {
      await community.save(null, {transacting: trx})
      await community.createStarterPosts(trx)
      return community.addGroupMembers([userId],
        {role: GroupMembership.Role.MODERATOR}, {transacting: trx})
    })

    await Queue.classMethod('Community', 'notifyAboutCreate',
      {communityId: community.id})

    return memberships[0]
  },

  isSlugValid: function (slug) {
    const regex = /^[0-9a-z-]{2,40}$/
    return regex.test(slug)
  }
})

function createFeedItem ({ post }) {
  return {
    type: 'post',
    content: post
  }
}
