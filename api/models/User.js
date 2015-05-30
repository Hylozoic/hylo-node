var bcrypt = require('bcrypt'),
  crypto = require('crypto');

module.exports = bookshelf.Model.extend({
  tableName: 'users',

  memberships: function() {
    return this.hasMany(Membership, 'users_id');
  },

  communities: function() {
    return this.belongsToMany(Community, 'users_community', 'users_id', 'community_id');
  },

  posts: function() {
    return this.hasMany(Post, 'creator_id');
  },

  linkedAccounts: function() {
    return this.hasMany(LinkedAccount);
  },

  sentInvitations: function() {
    return this.hasMany(Invitation, 'invited_by_id');
  },

  skills: function() {
    return this.hasMany(Skill);
  },

  organizations: function() {
    return this.hasMany(Organization);
  },

  phones: function() {
    return this.hasMany(UserPhone);
  },

  emails: function() {
    return this.hasMany(UserEmail);
  },

  websites: function() {
    return this.hasMany(UserWebsite);
  },

  contributions: function() {
    return this.hasMany(Contribution);
  },

  thanks: function() {
    return this.hasMany(Thank)
  },

  devices: function() {
    return this.hasMany(Device, 'user_id');
  },

    
  onboarding: function() {
    return this.hasOne(Tour).query({where: {type: 'onboarding'}});
  },

  activity: function() {
    return this.hasMany(Activity, 'reader_id');
  },

  setModeratorRole: function(community) {
    return Membership.setModeratorRole(this.id, (typeof community === 'object' ? community.id : community));
  },

  removeModeratorRole: function(community) {
    return Membership.removeModeratorRole(this.id, (typeof community === 'object' ? community.id : community));
  },

  joinCommunity: function(community) {
    var communityId = (typeof community === 'object' ? community.id : community);
    return Membership.create(this.id, communityId, {role: Membership.DEFAULT_ROLE});
  },

  // sanitize certain values before storing them
  setSanely: function(attrs) {
    var saneAttrs = _.clone(attrs);

    if (saneAttrs.twitter_name) {
      if (saneAttrs.twitter_name.match(/^\s*$/)) {
        saneAttrs.twitter_name = null;
      } else if (saneAttrs.twitter_name.match(/^@/)) {
        saneAttrs.twitter_name = saneAttrs.twitter_name.substring(1);
      }
    }

    return this.set(saneAttrs);
  },

  encryptedEmail: function() {
    return User.encryptEmail(this.get('email'));
  },

  generateTokenContents: function() {
    return format('crumbly:%s:%s:%s', this.id, this.get('email'), this.get('date_created'));
  },

  generateToken: function() {
    var hash = Promise.promisify(bcrypt.hash, bcrypt);
    return hash(this.generateTokenContents(), 10);
  },

  checkToken: function(token) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt);
    return compare(this.generateTokenContents(), token);
  },

  sendPushNotification: function(alert, url) {
    this.devices()
      .fetch()
      .then(function (devices) {
        return devices.map(function (device) {
          device.sendPushNotification(alert, url);
        })
      })
  }

    
}, {

  authenticate: function(email, password) {
    var compare = Promise.promisify(bcrypt.compare, bcrypt);

    return User.where({email: email}).fetch({withRelated: ['linkedAccounts']})
    .then(function(user) {
      if (!user)
        throw 'email not found';

      var account = user.relations.linkedAccounts.where({provider_key: 'password'})[0];
      if (!account) {
        var keys = user.relations.linkedAccounts.pluck('provider_key');
        throw format('password account not found. available: [%s]', keys.join(','));
      }

      return compare(password, account.get('provider_user_id')).then(function(match) {
        if (!match)
          throw 'password does not match';

        return user;
      });
    });
  },

  create: function(attributes, options) {
    var trx = options.transacting,
      account = attributes.account,
      community = attributes.community;

    attributes = _.merge(_.omit(attributes, 'account', 'community'), {
      avatar_url: User.gravatar(attributes.email),
      date_created: new Date(),
      active: true
    });

    if (account.type === 'facebook') {
      _.merge(attributes, {
        facebook_url: account.profile.profileUrl,
        avatar_url: format('http://graph.facebook.com/%s/picture?type=large', account.profile.id)
      });
    } else if (account.type === 'linkedin') {
      _.merge(attributes, {
        linkedin_url: account.profile._json.publicProfileUrl,
        avatar_url: account.profile.photos[0]
      });
    }

    return new User(attributes).save({}, {transacting: trx}).tap(function(user) {
      return Promise.join(
        LinkedAccount.create(user.id, account, {transacting: trx}),
        (community ? Membership.create(user.id, community.id, {transacting: trx}) : null)
      );
    });
  },

  find: function(id, options) {
    return User.where({id: id}).fetch(options);
  },

  named: function(name) {
    return User.where({name: name}).fetch();
  },

  createdInTimeRange: function(collection, startTime, endTime) {
    if (endTime == undefined) {
      endTime = startTime;
      startTime = collection;
      collection = User;
    }
    return collection.query(function(qb) {
      qb.whereRaw('users.date_created between ? and ?', [startTime, endTime]);
      qb.where('users.active', true);
    });
  },

  isEmailUnique: function(email, notEmail) {
    // FIXME there should be a better way to do this
    return bookshelf.knex('users')
      .where('email', email).andWhere('email', '!=', notEmail)
      .count('*')
      .then(function(result) {
        return result[0].count == 0;
      });
  },

  incNewNotificationCount: function(userId, transaction) {
    var query = User.query().where({id: userId}).increment('new_notification_count', 1);
    return (transaction ? query.transacting(transaction) : query);
  },

  gravatar: function(email) {
    var emailHash = crypto.createHash('md5').update(email).digest('hex');
    return format('http://www.gravatar.com/avatar/%s?d=mm&s=140', emailHash);
  },

  encryptEmail: function(email) {
    var plaintext = format('%s%s', process.env.MAILGUN_EMAIL_SALT, email);
    return format('u=%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN);
  },

  decryptEmail: function(email) {
    var pattern = new RegExp(format("u=(\\w+)@%s", process.env.MAILGUN_DOMAIN)),
      match = email.match(pattern),
      hash = match[1],
      decrypted = PlayCrypto.decrypt(hash),
      unsalted = decrypted.replace(new RegExp('^' + process.env.MAILGUN_EMAIL_SALT), '');

    return unsalted;
  },
  
  sendPushNotification: function(userId, alert, url) {
    return User.find(userId)
      .fetch()
      .sendPushNotification(alert, url);
  }

});
