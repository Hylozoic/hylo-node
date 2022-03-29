/* globals RedisClient */
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import uuid from 'node-uuid'
import validator from 'validator'
import { get, has, isEmpty, merge, omit, pick, intersectionBy } from 'lodash'
import { Validators } from 'hylo-shared'
import HasSettings from './mixins/HasSettings'
import { findThread } from './post/findOrCreateThread'

module.exports = bookshelf.Model.extend(merge({
  tableName: 'users',
  requireFetch: false,
  hasTimestamps: true,

  activity: function () {
    return this.hasMany(Activity, 'reader_id')
  },

  affiliations: function () {
    return this.hasMany(Affiliation).where('is_active', true)
  },

  comments: function () {
    return this.hasMany(Comment)
    .query(q => {
      // TODO: this breaks recent activity, but it is sketchy to take out here.
      // q.join('posts', 'posts.id', 'comments.post_id')
      q.whereNotIn('posts.user_id', BlockedUser.blockedFor(this.id))
      q.where(function () {
        this.where('posts.type', '!=', Post.Type.THREAD)
        .orWhere('posts.type', null)
      })
    })
  },

  memberships() {
    return this.hasMany(GroupMembership)
      .query(q => q.leftJoin('groups', 'groups.id', 'group_memberships.group_id')
        .where('group_memberships.active', true)
        .where('groups.active', true)
      )
  },

  contributions: function () {
    return this.hasMany(Contribution)
  },

  devices: function () {
    return this.hasMany(Device, 'user_id')
  },

  eventsAttending: function () {
    return this.belongsToMany(Post, 'event_invitations', 'user_id', 'event_id')
      .where('posts.end_time', '>', new Date())
      .where('event_invitations.response', 'yes')
  },

  groups: function () {
    return this.belongsToMany(Group).through(GroupMembership)
      .where('groups.active', true)
      .where('group_memberships.active', true)
  },

  groupInvitesPending: function () {
    return this.hasMany(Invitation, 'email', 'email')
      .query({ where: { 'used_by_id': null, 'expired_by_id': null } })
      .orderBy('created_at', 'desc')
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

  locationObject: function () {
    return this.belongsTo(Location, 'location_id')
  },

  joinRequests: function () {
    return this.hasMany(JoinRequest)
  },

  moderatedGroupMemberships: function () {
    return this.memberships()
      .where('group_memberships.role', GroupMembership.Role.MODERATOR)
  },

  posts: function () {
    return this.hasMany(Post).query(q => q.where('type', '!=', Post.Type.THREAD))
  },

  projects: function () {
    // TODO: fix
    return this.hasMany(Post).query(q => q.leftJoin('groups', 'groups.group_data_id', 'posts.id')
      .leftJoin('group_memberships', 'group_memberships.group_id', 'groups.id')
      .whereNotNull('group_memberships.project_role_id')
      .andWhere('group_memberships.user_id', this.id)
      .andWhere('group_memberships.active', true)
    )
  },

  stripeAccount: function () {
    return this.belongsTo(StripeAccount)
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  postUsers: function () {
    return this.hasMany(PostUser, 'user_id')
  },

  followedPosts () {
    return this.belongsToMany(Post).through(PostUser).query(q => q.where({'posts_users.following': true, 'posts_users.active': true}))
  },

  messageThreads: function () {
    return this.followedPosts().query(q => q.where('type', Post.Type.THREAD))
  },

  eventsInvitedTo: function () {
    return this.belongsToMany(Post).through(EventInvitation)
  },

  sentInvitations: function () {
    return this.hasMany(Invitation, 'invited_by_id')
  },

  skills: function () {
    return this.belongsToMany(Skill, 'skills_users').query({ where: { type: Skill.Type.HAS } }).withPivot(['type'])
  },

  skillsToLearn: function () {
    return this.belongsToMany(Skill, 'skills_users').query({ where: { type: Skill.Type.LEARNING } }).withPivot(['type'])
  },

  blockedUsers: function () {
    return this.belongsToMany(User, 'blocked_users', 'user_id', 'blocked_user_id')
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  intercomHash: function () {
    return crypto.createHmac('sha256', process.env.INTERCOM_KEY)
    .update(this.id)
    .digest('hex')
  },

  reactivate: function () {
    return this.save({ active: true })
  },

  deactivate: async function (sessionId) {
    Queue.classMethod('User', 'clearSessionsFor', { userId: this.get('user_id'), sessionId })
    return this.save({ active: false })
  },

  deleteUserMedia: async function () {
    const userId = this.get('id')
    const userUrls = [this.get('banner_url'), this.get('avatar_url')]

    const mediaUrls = await Media.findMediaUrlsForUser(userId)
    const urls = mediaUrls.concat(userUrls)
    Queue.classMethod('Media', 'deleteMediaByUrl', { urls })
  },

  sanelyDeleteUser: async function ({ sessionId, transacting = {} }) {
    /* 
      ### List of things to be done on account deletion ###

      - Look up urls for all their possible uploads
      - drop urls from external sources
      - iterate through urls to delete each upload

      - zero out content of their posts and comments
      - remove other references to their user_id
      - wipe their user record!
    */

    await this.deleteUserMedia()
    Queue.classMethod('User', 'clearSessionsFor', { userId: this.get('user_id'), sessionId })

    const query = `
    BEGIN;
    UPDATE posts SET name = 'Post by deleted user', description = '', location = NULL, location_id = NULL WHERE user_id = ${this.id};
    DELETE FROM user_connections WHERE (user_id = ${this.id}) OR (other_user_id = ${this.id});

    UPDATE comments SET text = 'Comment by deleted user' WHERE user_id = ${this.id};

    DELETE FROM thanks WHERE comment_id in (select id from comments WHERE user_id = ${this.id});
    DELETE FROM thanks WHERE thanked_by_id = ${this.id};
    DELETE FROM notifications WHERE activity_id in (select id from activities WHERE reader_id = ${this.id});
    DELETE FROM notifications WHERE activity_id in (select id from activities WHERE actor_id = ${this.id});
    DELETE FROM push_notifications WHERE device_id in (select id from devices WHERE user_id = ${this.id});
    DELETE FROM activities WHERE actor_id = ${this.id};
    DELETE FROM activities WHERE reader_id = ${this.id};

    DELETE FROM contributions WHERE user_id = ${this.id};
    DELETE FROM devices WHERE user_id = ${this.id};
    DELETE FROM group_invites WHERE used_by_id = ${this.id};
    DELETE FROM group_memberships WHERE user_id = ${this.id};
    DELETE FROM communities_users WHERE user_id = ${this.id};
    DELETE FROM linked_account WHERE user_id = ${this.id};
    DELETE FROM join_request_question_answers WHERE join_request_id in (select id from join_requests WHERE user_id = ${this.id});
    DELETE FROM join_requests WHERE user_id = ${this.id};
    DELETE FROM skills_users WHERE user_id = ${this.id};
    DELETE FROM posts_about_users WHERE user_id = ${this.id};

    DELETE FROM tag_follows WHERE user_id = ${this.id};
    DELETE FROM user_external_data WHERE user_id = ${this.id};
    DELETE FROM user_post_relevance WHERE user_id = ${this.id};
    DELETE FROM posts_tags WHERE post_id in (select id from posts WHERE user_id = ${this.id});
    DELETE FROM votes WHERE user_id = ${this.id};

    UPDATE users SET 
    active = false, 
    settings = NULL, 
    name = 'Deleted User', 
    avatar_url = NULL, 
    bio = NULL, 
    banner_url = NULL,
    location = NULL,
    url = NULL,
    tagline = NULL,
    stripe_account_id = NULL,
    location_id = NULL,
    contact_email = NULL,
    contact_phone = NULL,
    email = '${uuid.v4()}@hylo.com',
    first_name = NULL,
    last_name = NULL,
    twitter_name = NULL,
    linkedin_url = NULL,
    facebook_url = NULL,
    work = NULL,
    intention = NULL,
    extra_info = NULL
    WHERE id = ${this.id};

    COMMIT;
    `
    return bookshelf.knex.raw(query)
  },

  joinGroup: async function (group, role = GroupMembership.Role.DEFAULT, fromInvitation = false, { transacting } = {}) {
    const memberships = await group.addMembers([this.id],
      {
        role,
        settings: {
          sendEmail: true,
          sendPushNotifications: true,
          showJoinForm: fromInvitation
        }
      },
      { transacting })
    const q = Group.query()
    if (transacting) {
      q.transacting(transacting)
    }
    await this.followDefaultTags(group.id, transacting)
    await this.markInvitationsUsed(group.id, transacting)
    return memberships[0]
  },

  leaveGroup: async function (group) {
    await group.removeMembers([this.id])
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

  generateJWT: function () {
    return jwt.sign({
      iss: 'https://hylo.com',
      aud: 'https://hylo.com',
      sub: this.id,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4) // 4 hour expiration
    }, process.env.JWT_SECRET);
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

  followDefaultTags: function (groupId, trx) {
    return this.constructor.followDefaultTags(this.id, groupId, trx)
  },

  hasNoAvatar: function () {
    return this.get('avatar_url') === User.gravatar(this.get('email'))
  },

  markInvitationsUsed: function (groupId, trx) {
    const q = Invitation.query()
    if (trx) {
      q.transacting(trx)
    }
    return q.where('group_id', groupId)
    .whereRaw('lower(email) = lower(?)', this.get('email'))
    .update({ used_by_id: this.id, used_at: new Date() })
  },

  setPassword: function (password, sessionId, { transacting } = {}) {
    return LinkedAccount.where({user_id: this.id, provider_key: 'password'})
    .fetch({transacting}).then(account => account
      ? account.updatePassword(password, sessionId, {transacting})
      : LinkedAccount.create(this.id, {type: 'password', password, transacting}))
  },

  hasDevice: function () {
    return this.load('devices')
    .then(() => this.relations.devices.length > 0)
  },

  validateAndSave: function (sessionId, changes) {
    // TODO maybe throw an error if a non-whitelisted field is supplied (besides
    // tags and password, which are used later)
    var whitelist = pick(changes, [
      'avatar_url', 'banner_url', 'bio', 'email', 'contact_email', 'contact_phone',
      'extra_info', 'facebook_url', 'intention', 'linkedin_url', 'location', 'location_id',
      'name', 'password', 'settings', 'tagline', 'twitter_name', 'url', 'work',
      'new_notification_count'
    ])

    return bookshelf.transaction(transacting =>
      validateUserAttributes(whitelist, {existingUser: this, transacting})
      // we refresh the user's data inside the transaction to avoid a race
      // condition between two updates on the same user that depend upon
      // existing data, e.g. when updating settings
      .then(() => this.refresh({transacting}))
      .then(() => this.setSanely(omit(whitelist, 'password')))
      .then(() => Promise.all([
        changes.password && this.setPassword(changes.password, sessionId, {transacting}),
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
    return findThread([this.id, userId])
  },

  unseenThreadCount () {
    return User.unseenThreadCount(this.id)
  },

  async groupsSharedWithPost (post) {
    const myGroups = await this.groups().fetch()
    await post.load('groups')
    return intersectionBy(post.relations.groups.models, myGroups.models, 'id')
  },

  async groupsSharedWithUser (user) {
    const myGroups = await this.groups().fetch()
    const theirGroups = await user.groups().fetch()
    return intersectionBy(myGroups.models, theirGroups.models, 'id')
  },

  async updateStripeAccount (accountId, refreshToken = '') {
    await this.load('stripeAccount')
    const existingAccount = this.relations.stripeAccount
    const newAccount = await StripeAccount.forge({
      stripe_account_external_id: accountId,
      refresh_token: refreshToken
    }).save()
    return this.save({
      stripe_account_id: newAccount.id
    })
    .then(() => {
      if (existingAccount) {
        return existingAccount.destroy()
      }
    })
  },

  hasStripeAccount () {
    return !!this.get('stripe_account_id')
  }

}, HasSettings), {
  AXOLOTL_ID: '13986',

  authenticate: Promise.method(function (email, password) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt)

    if (!email) throw new Error('no email provided')
    if (!password) throw new Error('no password provided')

    return User.query('whereRaw', 'lower(email) = lower(?)', email)
    .fetch({withRelated: ['linkedAccounts']})
    .then(function (user) {
      if (!user) throw new Error('email not found')

      var account = user.relations.linkedAccounts.find(a => a.get('provider_key') === 'password')

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

  clearSessionsFor: async function({ userId, sessionId }) {
    const redisClient = await RedisClient.create()
    for await (const key of redisClient.scanIterator({ MATCH: `sess:${userId}:*` })) {
      if (key !== "sess:" + sessionId) {
        await redisClient.del(key)
      }
    }
  },

  create: function (attributes) {
    const { account, group } = attributes
    const groupId = Number(get(group, 'id'))
    const digest_frequency = groupId === 2308 ? 'weekly' : 'daily' // eslint-disable-line camelcase

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
    }, omit(attributes, 'account', 'group'))

    if (account) {
      merge(
        attributes,
        LinkedAccount.socialMediaAttributes(account.type, account.profile)
      )
    }

    if (!attributes.name && attributes.email) {
      attributes.name = attributes.email.split('@')[0].replace(/[._]/g, ' ')
    }

    return bookshelf.transaction(transacting =>
      validateUserAttributes(attributes, { transacting })
      .then(() => new User(attributes).save({}, {transacting}))
      .then(async (user) => {
        await Promise.join(
          account && LinkedAccount.create(user.id, account, {transacting}),
          group && group.addMembers([user.id], {transacting}),
          group && user.markInvitationsUsed(group.id, transacting),
          // TODO: we will use this when we shortly add API calls to create users, so we can confirm their email
          // !user.get('email_validated') && Queue.classMethod('Email', 'sendEmailVerification', {
          //   email: user.get('email'),
          //   templateData: {
          //     verify_url: Frontend.Route.verifyEmail(user.generateJWT())
          //   }
          // })
        )
        return user
      })
    )
  },

  find: function (id, options, activeFilter = true) {
    if (!id) return Promise.resolve(null)
    let q
    if (isNaN(Number(id))) {
      q = User.query(q => {
        q.where(function () {
          this.whereRaw('lower(email) = lower(?)', id)
          .orWhere({ name: id })
        })
      })
    } else {
      q = User.where({ id })
    }
    if (activeFilter) return q.where('users.active', true).fetch(options)
    return q.fetch(options)
  },

  named: function (name) {
    return User.where({ name }).fetch()
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

  followTags: function (userId, groupId, tagIds, trx) {
    return Promise.each(tagIds, id =>
      TagFollow.add({
        userId: userId,
        groupId: groupId,
        tagId: id,
        transacting: trx
      })
      .catch(err => {
        if (!err.message.match(/duplicate key value/)) throw err
      }))
  },

  followDefaultTags: function (userId, groupId, trx) {
    return GroupTag.defaults(groupId, trx)
    .then(defaultTags => defaultTags.models.map(t => t.get('tag_id')))
    .then(ids => User.followTags(userId, groupId, ids, trx))
  },

  resetTooltips: function (userId) {
    return User.find(userId)
    .then(user => user.removeSetting('viewedTooltips', true))
  },

  unseenThreadCount: async function (userId) {
    const lastViewed = await User.where('id', userId).query()
    .select(bookshelf.knex.raw("settings->'last_viewed_messages_at' as time"))
    .then(rows => new Date(rows[0].time))

    return PostUser.whereUnread(userId, { afterTime: lastViewed })
    .query(q => {
      q.where('posts.type', Post.Type.THREAD)
      q.where('num_comments', '>', 0)
    })
    .count().then(c => Number(c))
  }
})

function validateUserAttributes (attrs, { existingUser, transacting } = {}) {
  if (has(attrs, 'password')) {
    const invalidReason = Validators.validateUser.password(attrs.password)
    if (invalidReason) return Promise.reject(new Error(invalidReason))
  }

  if (has(attrs, 'name')) {
    const invalidReason = Validators.validateUser.name(attrs.name)
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
