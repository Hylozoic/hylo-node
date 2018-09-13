import bcrypt from 'bcrypt'
import crypto from 'crypto'
import validator from 'validator'
import { get, has, isEmpty, merge, omit, pick, intersectionBy } from 'lodash'
import { validateUser } from 'hylo-utils/validators'
import HasSettings from './mixins/HasSettings'
import HasGroupMemberships from './user/HasGroupMemberships'
import { findThread } from './post/findOrCreateThread'

module.exports = bookshelf.Model.extend(merge({
  tableName: 'users',

  activity: function () {
    return this.hasMany(Activity, 'reader_id')
  },

  comments: function () {
    return this.hasMany(Comment)
    .query(q => {
      q.join('posts', 'posts.id', 'comments.post_id')

      console.log('!!! Post commentersQuery this.id:', this.id)
      q.where('posts.user_id', 'NOT IN', BlockedUser.blockedFor(this.id))

      q.where(function () {
        this.where('posts.type', '!=', Post.Type.THREAD)
        .orWhere('posts.type', null)
      })
    })
  },

  communities: function () {
    return this.queryByGroupMembership(Community)
    .query(q => q.where('active', true))
  },

  contributions: function () {
    return this.hasMany(Contribution)
  },

  devices: function () {
    return this.hasMany(Device, 'user_id')
  },

  inAppNotifications: function () {
    return this.hasMany(Notification)
    .query({where: {'notifications.medium': Notification.MEDIUM.InApp}})
  },

  followedTags: function () {
    return this.belongsToMany(Tag).through(TagFollow)
  },

  tagFollows: function () {
    return this.hasMany(TagFollow)
  },

  linkedAccounts: function () {
    return this.hasMany(LinkedAccount)
  },

  memberships: function () {
    return this.groupMembershipsForModel(Community)
  },

  posts: function () {
    return this.hasMany(Post).query(q => q.where(function () {
      this.where('type', null).orWhere('type', '!=', Post.Type.THREAD)
    }))
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  followedPosts () {
    return this.queryByGroupMembership(Post, {
      where: q => q.whereRaw(`(settings->>'following')::boolean = true`)
    })
    .query(q => {

      // // TODO: Block
      // q.where('user_id', 'NOT IN', [process.env.BLOCKED_USER_ID])

      return q.where('active', true)
    })
  },

  messageThreads: function () {
    return this.followedPosts().query(q => q.where('type', Post.Type.THREAD))
  },

  eventsRespondedTo: function () {
    return this.belongsToMany(Post).through(EventResponse)
  },

  sentInvitations: function () {
    return this.hasMany(Invitation, 'invited_by_id')
  },

  skills: function () {
    return this.belongsToMany(Skill, 'skills_users')
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  intercomHash: function () {
    return crypto.createHmac('sha256', process.env.INTERCOM_KEY)
    .update(this.id)
    .digest('hex')
  },

  joinCommunity: async function (community, role = GroupMembership.Role.DEFAULT, { transacting } = {}) {
    const memberships = await community.addGroupMembers([this.id],
      {
        role,
        settings: {
          sendEmail: true,
          sendPushNotifications: true
        }},
      {transacting})
    await Community.query().where('id', community.id)
    .increment('num_members').transacting(transacting)
    await this.followDefaultTags(community.id, transacting)
    await this.markInvitationsUsed(community.id, transacting)
    return memberships[0]
  },

  leaveCommunity: async function (community) {
    await community.removeGroupMembers([this.id])
    await Community.query().where('id', community.id).decrement('num_members')
  },

  // sanitize certain values before storing them
  setSanely: function (attrs) {
    const saneAttrs = omit(attrs, 'settings')

    if (!isEmpty(saneAttrs.twitter_name)) {
      if (saneAttrs.twitter_name.match(/^\s*$/)) {
        saneAttrs.twitter_name = null
      } else if (saneAttrs.twitter_name.match(/^@/)) {
        saneAttrs.twitter_name = saneAttrs.twitter_name.substring(1)
      }
    }
    const urlAttrs = ['url', 'facebook_url', 'linkedin_url']

    urlAttrs.forEach(key => {
      const normalized = addProtocol(saneAttrs[key])
      if (!isEmpty(normalized)) {
        saneAttrs[key] = normalized
      }
    })

    if (attrs.settings) this.addSetting(attrs.settings)

    return this.set(saneAttrs)
  },

  encryptedEmail: function () {
    return User.encryptEmail(this.get('email'))
  },

  generateTokenContents: function () {
    return `crumbly:${this.id}:${this.get('email')}:${this.get('created_at')}`
  },

  generateToken: function () {
    var hash = Promise.promisify(bcrypt.hash, bcrypt)
    return hash(this.generateTokenContents(), 10)
  },

  generateTokenSync: function () {
    return bcrypt.hashSync(this.generateTokenContents(), 10)
  },

  checkToken: function (token) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt)
    return compare(this.generateTokenContents(), token)
  },

  sendPushNotification: function (alert, url) {
    return this.devices().fetch()
    .then(devices => Promise.map(devices.models, device =>
      device.sendPushNotification(alert, url)))
  },

  resetNotificationCount: function () {
    return this.devices().fetch()
    .then(devices => Promise.map(devices.models, device =>
      device.resetNotificationCount()))
  },

  followDefaultTags: function (communityId, trx) {
    return this.constructor.followDefaultTags(this.id, communityId, trx)
  },

  hasNoAvatar: function () {
    return this.get('avatar_url') === User.gravatar(this.get('email'))
  },

  markInvitationsUsed: function (communityId, trx) {
    return Invitation.query()
    .where('community_id', communityId)
    .whereRaw('lower(email) = lower(?)', this.get('email'))
    .update({used_by_id: this.id}).transacting(trx)
  },

  setPassword: function (password, { transacting } = {}) {
    return LinkedAccount.where({user_id: this.id, provider_key: 'password'})
    .fetch({transacting}).then(account => account
      ? account.updatePassword(password, {transacting})
      : LinkedAccount.create(this.id, {type: 'password', password, transacting}))
  },

  hasDevice: function () {
    return this.load('devices')
    .then(() => this.relations.devices.length > 0)
  },

  validateAndSave: function (changes) {
    // TODO maybe throw an error if a non-whitelisted field is supplied (besides
    // tags and password, which are used later)
    var whitelist = pick(changes, [
      'avatar_url', 'banner_url', 'bio', 'email', 'extra_info', 'facebook_url',
      'intention', 'linkedin_url', 'location', 'name', 'password', 'settings',
      'tagline', 'twitter_name', 'url', 'work', 'new_notification_count'
    ])

    return bookshelf.transaction(transacting =>
      validateUserAttributes(whitelist, {existingUser: this, transacting})
      // we refresh the user's data inside the transaction to avoid a race
      // condition between two updates on the same user that depend upon
      // existing data, e.g. when updating settings
      .then(() => this.refresh({transacting}))
      .then(() => this.setSanely(omit(whitelist, 'password')))
      .then(() => Promise.all([
        changes.password && this.setPassword(changes.password, {transacting}),
        !isEmpty(this.changed) && this.save(
          Object.assign({updated_at: new Date()}, this.changed),
          {patch: true, transacting}
        )
      ])))
    .then(() => this)
  },

  enabledNotification (type, medium) {
    let setting

    switch (type) {
      case Notification.TYPE.Message:
        setting = this.getSetting('dm_notifications')
        break
      case Notification.TYPE.Comment:
        setting = this.getSetting('comment_notifications')
        break
      default:
        throw new Error(`unknown notification type: ${type}`)
    }

    return setting === 'both' ||
      (setting === 'email' && medium === Notification.MEDIUM.Email) ||
      (setting === 'push' && medium === Notification.MEDIUM.Push)
  },

  disableAllNotifications () {
    return this.addSetting({
      digest_frequency: 'never',
      comment_notifications: 'none',
      dm_notifications: 'none'
    }, true)
  },

  unlinkAccount (provider) {
    const fieldName = {
      'facebook': 'facebook_url',
      'linkedin': 'linkedin_url',
      'twitter': 'twitter_name'
    }[provider]

    if (!fieldName) throw new Error(`${provider} not a supported provider`)

    return Promise.join(
      LinkedAccount.query().where({'user_id': this.id, provider_key: provider}).del(),
      this.save({[fieldName]: null})
    )
  },

  getMessageThreadWith (userId) {
    return findThread(this.id, [userId])
  },

  unseenThreadCount () {
    return User.unseenThreadCount(this.id)
  },

  async communitiesSharedWithPost (post) {
    const myCommunities = await this.communities().fetch()
    await post.load('communities')
    return intersectionBy(post.relations.communities.models, myCommunities.models, 'id')
  },

  async communitiesSharedWithUser (user) {
    const myCommunities = await this.communities().fetch()
    const theirCommunities = await user.communities().fetch()
    return intersectionBy(myCommunities.models, theirCommunities.models, 'id')
  }

}, HasSettings, HasGroupMemberships), {
  AXOLOTL_ID: '13986',

  authenticate: Promise.method(function (email, password) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt)

    if (!email) throw new Error('no email provided')
    if (!password) throw new Error('no password provided')

    return User.query('whereRaw', 'lower(email) = lower(?)', email)
    .fetch({withRelated: ['linkedAccounts']})
    .then(function (user) {
      if (!user) throw new Error('email not found')

      var account = user.relations.linkedAccounts.where({provider_key: 'password'})[0]
      if (!account) {
        var keys = user.relations.linkedAccounts.pluck('provider_key')
        throw new Error(`password account not found. available: [${keys.join(',')}]`)
      }

      return compare(password, account.get('provider_user_id')).then(function (match) {
        if (!match) throw new Error('password does not match')

        return user
      })
    })
  }),

  create: function (attributes, options = {}) {
    const { transacting } = options
    const { account, community } = attributes
    const communityId = Number(get(community, 'id'))
    const digest_frequency = communityId === 2308 ? 'weekly' : 'daily' // eslint-disable-line camelcase

    attributes = merge({
      avatar_url: User.gravatar(attributes.email),
      created_at: new Date(),
      updated_at: new Date(),
      settings: {
        digest_frequency,
        signup_in_progress: true,
        dm_notifications: 'both',
        comment_notifications: 'both'
      },
      active: true
    }, omit(attributes, 'account', 'community'))

    if (account) {
      merge(
        attributes,
        LinkedAccount.socialMediaAttributes(account.type, account.profile)
      )
    }

    if (!attributes.name && attributes.email) {
      attributes.name = attributes.email.split('@')[0].replace(/[._]/g, ' ')
    }

    return validateUserAttributes(attributes)
    .then(() => new User(attributes).save({}, {transacting}))
    .tap(user => Promise.join(
      account && LinkedAccount.create(user.id, account, {transacting}),
      community && community.addMembers([user.id], {transacting}),
      community && user.markInvitationsUsed(community.id, transacting)
    ))
  },

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    let q
    if (isNaN(Number(id))) {
      q = User.query(q => {
        q.where(function () {
          this.whereRaw('lower(email) = lower(?)', id)
          .orWhere({name: id})
        })
      })
    } else {
      q = User.where({id})
    }
    return q.where('active', true).fetch(options)
  },

  named: function (name) {
    return User.where({name: name}).fetch()
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = User
    }
    return collection.query(function (qb) {
      qb.whereRaw('users.created_at between ? and ?', [startTime, endTime])
      qb.where('users.active', true)
    })
  },

  isEmailUnique: function (email, excludeEmail, { transacting } = {}) {
    var query = bookshelf.knex('users')
    .whereRaw('lower(email) = lower(?)', email).count('*')
    .transacting(transacting)
    if (excludeEmail) query = query.andWhere('email', '!=', excludeEmail)
    return query.then(rows => Number(rows[0].count) === 0)
  },

  incNewNotificationCount: function (id) {
    return User.query().where({id}).increment('new_notification_count', 1)
  },

  resetNewNotificationCount: function (id) {
    return User.query().where({id}).update({new_notification_count: 0})
  },

  gravatar: function (email) {
    if (!email) email = ''
    var emailHash = crypto.createHash('md5').update(email).digest('hex')
    return `https://www.gravatar.com/avatar/${emailHash}?d=mm&s=140`
  },

  encryptEmail: function (email) {
    var plaintext = process.env.MAILGUN_EMAIL_SALT + email
    return `u=${PlayCrypto.encrypt(plaintext)}@${process.env.MAILGUN_DOMAIN}`
  },

  decryptEmail: function (email) {
    var pattern = new RegExp(`u=(\\w+)@${process.env.MAILGUN_DOMAIN}`)
    var match = email.match(pattern)
    var hash = match[1]
    var decrypted = PlayCrypto.decrypt(hash)
    var unsalted = decrypted.replace(new RegExp('^' + process.env.MAILGUN_EMAIL_SALT), '')

    return unsalted
  },

  sendPushNotification: function (userId, alert, url) {
    return User.find(userId).fetch().sendPushNotification(alert, url)
  },

  followTags: function (userId, communityId, tagIds, trx) {
    return Promise.each(tagIds, id =>
      TagFollow.add({
        userId: userId,
        communityId: communityId,
        tagId: id,
        transacting: trx
      })
      .catch(err => {
        if (!err.message.match(/duplicate key value/)) throw err
      }))
  },

  followDefaultTags: function (userId, communityId, trx) {
    return CommunityTag.defaults(communityId, trx)
    .then(defaultTags => defaultTags.models.map(t => t.get('tag_id')))
    .then(ids => User.followTags(userId, communityId, ids, trx))
  },

  resetTooltips: function (userId) {
    return User.find(userId)
    .then(user => user.removeSetting('viewedTooltips', true))
  },

  unseenThreadCount: async function (userId) {
    const { raw } = bookshelf.knex

    const lastViewed = await User.where('id', userId).query()
    .select(raw("settings->'last_viewed_messages_at' as time"))
    .then(rows => new Date(rows[0].time))

    return GroupMembership.whereUnread(userId, Post, {afterTime: lastViewed})
    .query(q => {
      q.join('posts', 'groups.group_data_id', 'posts.id')
      q.where('posts.type', Post.Type.THREAD)
      q.where('num_comments', '>', 0)
    })
    .count().then(c => Number(c))
  }
})

function validateUserAttributes (attrs, { existingUser, transacting } = {}) {
  if (has(attrs, 'password')) {
    const invalidReason = validateUser.password(attrs.password)
    if (invalidReason) return Promise.reject(new Error(invalidReason))
  }

  if (has(attrs, 'name')) {
    const invalidReason = validateUser.name(attrs.name)
    if (invalidReason) return Promise.reject(new Error(invalidReason))
  }

  // for an existing user, the email field can be omitted.
  if (existingUser && !has(attrs, 'email')) return Promise.resolve()
  const oldEmail = existingUser ? existingUser.get('email') : null

  if (!validator.isEmail(attrs.email)) {
    return Promise.reject(new Error('invalid-email'))
  }

  return User.isEmailUnique(attrs.email, oldEmail, {transacting})
  .then(unique => unique || Promise.reject(new Error('duplicate-email')))
}

export function addProtocol (url) {
  if (isEmpty(url)) return url
  const regex = /^(http:\/\/|https:\/\/)/
  if (regex.test(url)) {
    return url
  } else {
    return 'https://' + url
  }
}
