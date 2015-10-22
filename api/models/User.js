var bcrypt = require('bcrypt')
var crypto = require('crypto')

module.exports = bookshelf.Model.extend({
  tableName: 'users',

  activity: function () {
    return this.hasMany(Activity, 'reader_id')
  },

  comments: function () {
    return this.hasMany(Comment)
  },

  communities: function () {
    return this.belongsToMany(Community, 'users_community')
  },

  communityJoinRequests: function () {
    return this.hasMany(CommunityJoinRequest)
  },

  contributions: function () {
    return this.hasMany(Contribution)
  },

  devices: function () {
    return this.hasMany(Device, 'user_id')
  },

  emails: function () {
    return this.hasMany(UserEmail)
  },

  follows: function () {
    return this.hasMany(Follower)
  },

  linkedAccounts: function () {
    return this.hasMany(LinkedAccount)
  },

  memberships: function () {
    return this.hasMany(Membership)
  },

  onboarding: function () {
    return this.hasOne(Tour).query({where: {type: 'onboarding'}})
  },

  organizations: function () {
    return this.hasMany(Organization)
  },

  phones: function () {
    return this.hasMany(UserPhone)
  },

  posts: function () {
    return this.hasMany(Post)
  },

  sentInvitations: function () {
    return this.hasMany(Invitation, 'invited_by_id')
  },

  skills: function () {
    return this.hasMany(Skill)
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  websites: function () {
    return this.hasMany(UserWebsite)
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

  checkToken: function (token) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt)
    return compare(this.generateTokenContents(), token)
  },

  sendPushNotification: function (alert, url) {
    return this.devices().fetch()
      .then(devices => devices.map(device => device.sendPushNotification(alert, url)))
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

    if (account && account.type === 'facebook') {
      _.merge(attributes, {
        facebook_url: account.profile.profileUrl,
        avatar_url: format('http://graph.facebook.com/%s/picture?type=large', account.profile.id)
      })
    } else if (account && account.type === 'linkedin') {
      _.merge(attributes, {
        linkedin_url: account.profile._json.publicProfileUrl,
        avatar_url: account.profile.photos[0]
      })
    }

    return new User(attributes).save({}, {transacting: trx}).tap(user => Promise.join(
      account && LinkedAccount.create(user.id, account, {transacting: trx}),
      community && Membership.create(user.id, community.id, {transacting: trx})
    ))
  },

  createFully: (attrs, invitation) =>
    bookshelf.transaction(trx =>
      User.create(attrs, {transacting: trx}).tap(user =>
        Promise.join(
          Tour.startOnboarding(user.id, {transacting: trx}),
          invitation && invitation.use(user.id, {transacting: trx}),
          attrs.community && Post.createWelcomePost(user.id, attrs.community.id, trx)
        ))),

  find: function (id, options) {
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

  isEmailUnique: function (email, notEmail) {
    // FIXME there should be a better way to do this
    return bookshelf.knex('users')
    .where('email', email).andWhere('email', '!=', notEmail)
    .count('*')
    .then(function (result) {
      return result[0].count === 0
    })
  },

  incNewNotificationCount: function (userId, transaction) {
    var query = User.query().where({id: userId}).increment('new_notification_count', 1)
    return (transaction ? query.transacting(transaction) : query)
  },

  gravatar: function (email) {
    var emailHash = crypto.createHash('md5').update(email).digest('hex')
    return format('http://www.gravatar.com/avatar/%s?d=mm&s=140', emailHash)
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
  }

})
