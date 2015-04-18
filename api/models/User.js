var format = require('util').format;

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
    var plaintext = format('%s%s', process.env.MAILGUN_EMAIL_SALT, this.get('email'));
    return format('u=%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN);
  }

}, {

  authenticate: function(email, password) {
    var bcrypt = require('bcrypt'),
      compare = Promise.promisify(bcrypt.compare, bcrypt);

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
      password = attributes.password,
      community = attributes.community;

    delete attributes.password;
    delete attributes.community;

    return new User(attributes).save({}, {transacting: trx}).tap(function(user) {
      return Promise.join(
        LinkedAccount.forUserWithPassword(user, password).save({}, {transacting: trx}),
        Membership.create(user.id, community.id, {transacting: trx})
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
  }

});
