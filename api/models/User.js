var bcrypt = require('bcrypt')
var crypto = require('crypto')
var validator = require('validator')

module.exports = bookshelf.Model.extend({
  tableName: 'users',

  activity: function () {
    return this.hasMany(Activity, 'reader_id')
  },

  comments: function () {
    return this.hasMany(Comment)
  },

  communities: function () {
    return this.belongsToMany(Community, 'users_community').through(Membership)
      .query({where: {'users_community.active': true, 'community.active': true}}).withPivot('role')
  },

  contributions: function () {
    return this.hasMany(Contribution)
  },

  devices: function () {
    return this.hasMany(Device, 'user_id')
  },

  followedPosts: function () {
    return this.belongsToMany(Post).through(Follow)
  },

  lastReads: function () {
    return this.hasMany(LastRead)
  },

  followedTags: function () {
    return this.belongsToMany(Tag).through(TagFollow)
  },

  linkedAccounts: function () {
    return this.hasMany(LinkedAccount)
  },

  memberships: function () {
    return this.hasMany(Membership).query(qb => {
      qb.where('users_community.active', true)
      qb.leftJoin('community', function () {
        this.on('community.id', '=', 'users_community.community_id')
      })
      qb.where('community.active', true)
    })
  },

  posts: function () {
    return this.hasMany(Post)
  },

  eventsRespondedTo: function () {
    return this.belongsToMany(Post).through(EventResponse)
  },

  sentInvitations: function () {
    return this.hasMany(Invitation, 'invited_by_id')
  },

  tags: function () {
    return this.belongsToMany(Tag).through(TagUser)
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  setModeratorRole: function (community) {
    return Membership.setModeratorRole(this.id, (typeof community === 'object' ? community.id : community))
  },

  removeModeratorRole: function (community) {
    return Membership.removeModeratorRole(this.id, (typeof community === 'object' ? community.id : community))
  },

  joinCommunity: function (community) {
    var communityId = (typeof community === 'object' ? community.id : community)
    return Membership.create(this.id, communityId, {role: Membership.DEFAULT_ROLE})
  },

  // sanitize certain values before storing them
  setSanely: function (attrs) {
    var saneAttrs = _.clone(attrs)

    if (saneAttrs.twitter_name) {
      if (saneAttrs.twitter_name.match(/^\s*$/)) {
        saneAttrs.twitter_name = null
      } else if (saneAttrs.twitter_name.match(/^@/)) {
        saneAttrs.twitter_name = saneAttrs.twitter_name.substring(1)
      }
    }

    if (attrs.settings) {
      saneAttrs.settings = _.merge({}, this.get('settings'), attrs.settings)
    }

    return this.set(saneAttrs)
  },

  encryptedEmail: function () {
    return User.encryptEmail(this.get('email'))
  },

  generateTokenContents: function () {
    return format('crumbly:%s:%s:%s', this.id, this.get('email'), this.get('created_at'))
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
    .then(devices => Promise.map(devices.models, device => device.sendPushNotification(alert, url)))
  },

  resetNotificationCount: function () {
    return this.devices().fetch()
    .then(devices => Promise.map(devices.models, device => device.resetNotificationCount()))
  },

  followDefaultTags: function (communityId, trx) {
    return CommunityTag.defaults(communityId, trx)
    .then(defaultTags => defaultTags.models.map(communityTag =>
      communityTag
        ? new TagFollow({
          user_id: this.id,
          community_id: communityId,
          tag_id: communityTag.get('tag_id')
        })
        .save({}, {transacting: trx})
      : null))
  }

}, {
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
        throw new Error(format('password account not found. available: [%s]', keys.join(',')))
      }

      return compare(password, account.get('provider_user_id')).then(function (match) {
        if (!match) throw new Error('password does not match')

        return user
      })
    })
  }),

  validate: attrs => {
    if (!validator.isEmail(attrs.email)) return 'invalid email'
  },

  create: function (attributes, options) {
    if (!options) options = {}
    var trx = options.transacting
    var account = attributes.account
    var community = attributes.community

    attributes = _.merge({
      avatar_url: User.gravatar(attributes.email),
      created_at: new Date(),
      updated_at: new Date(),
      send_email_preference: true,
      push_follow_preference: true,
      push_new_post_preference: true,
      settings: {digest_frequency: 'daily'},
      active: true
    }, _.omit(attributes, 'account', 'community'))

    if (account) {
      _.merge(
        attributes,
        LinkedAccount.socialMediaAttributes(account.type, account.profile)
      )
    }

    if (!attributes.name) {
      attributes.name = attributes.email.split('@')[0].replace(/[\._]/g, ' ')
    }

    var validationError = User.validate(attributes)
    if (validationError) return Promise.reject(new Error(validationError))

    return new User(attributes).save({}, {transacting: trx})
    .tap(user => Promise.join(
      account && LinkedAccount.create(user.id, account, {transacting: trx}),
      community && Membership.create(user.id, community.id, {transacting: trx})
    ))
  },

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    if (isNaN(Number(id))) {
      return User.query(q => q.where({email: id}).orWhere({name: id})).fetch(options)
    }
    return User.where({id: id}).fetch(options)
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

  isEmailUnique: function (email, excludeEmail) {
    var query = bookshelf.knex('users').where('email', email).count('*')
    if (excludeEmail) query = query.andWhere('email', '!=', excludeEmail)
    return query.then(rows => Number(rows[0].count) === 0)
  },

  incNewNotificationCount: function (userId, communityIds, txn) {
    const communityQuery = Membership.query()
    .where('user_id', userId)
    .where('community_id', 'in', communityIds)
    .increment('new_notification_count', 1)

    const userQuery = User.query()
    .where({id: userId})
    .increment('new_notification_count', 1)

    return Promise.all([
      (txn ? communityQuery.transacting(txn) : communityQuery),
      (txn ? userQuery.transacting(txn) : userQuery)
    ])
  },

  gravatar: function (email) {
    var emailHash = crypto.createHash('md5').update(email).digest('hex')
    return format('https://www.gravatar.com/avatar/%s?d=mm&s=140', emailHash)
  },

  encryptEmail: function (email) {
    var plaintext = format('%s%s', process.env.MAILGUN_EMAIL_SALT, email)
    return format('u=%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN)
  },

  decryptEmail: function (email) {
    var pattern = new RegExp(format('u=(\\w+)@%s', process.env.MAILGUN_DOMAIN))
    var match = email.match(pattern)
    var hash = match[1]
    var decrypted = PlayCrypto.decrypt(hash)
    var unsalted = decrypted.replace(new RegExp('^' + process.env.MAILGUN_EMAIL_SALT), '')

    return unsalted
  },

  sendPushNotification: function (userId, alert, url) {
    return User.find(userId).fetch()
    .sendPushNotification(alert, url)
  },

  followTags: function (userId, communityId, tagIds, trx) {
    return Promise.each(tagIds, id =>
      new TagFollow({
        user_id: userId,
        community_id: communityId,
        tag_id: id
      })
      .save({}, {transacting: trx})
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
    .then(user => {
      const settings = user.get('settings')
      settings.viewedTooltips = {}
      return user.save({settings})
    })
  }
})
