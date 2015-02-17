var format = require('util').format,
  Promise = require('bluebird');

var extraUserAttributes = function(user) {
  return Promise.props({
    public_email: user.encryptedEmail(),
    skills: Skill.simpleList(user.relations.skills),
    organizations: Organization.simpleList(user.relations.organizations),
    seed_count: Post.countForUser(user),
    contribution_count: Contribution.countForUser(user),
    thank_count: Thank.countForUser(user)
  });
};

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
    return this.hasMany(Skill, 'users_id');
  },

  organizations: function() {
    return this.hasMany(Organization, 'users_id');
  },

  contributions: function() {
    return this.hasMany(Contribution, 'user_id');
  },

  thanks: function() {
    return this.hasMany(Thank, 'user_id')
  },

  setModeratorRole: function(community) {
    return Membership.setModeratorRole(this.id, (typeof community === 'object' ? community.id : community));
  },

  removeModeratorRole: function(community) {
    return Membership.removeModeratorRole(this.id, (typeof community === 'object' ? community.id : community));
  },

  joinCommunity: function(community) {
    return bookshelf.knex('users_community').insert({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community),
      role: Membership.DEFAULT_ROLE
    });
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
    });
  },

  fetchForSelf: function(id) {
    return User.find(id, {
      withRelated: [
        'memberships',
        'memberships.community',
        'skills',
        'organizations',
        'linkedAccounts'
      ]
    }).then(function(user) {
      return Promise.join(user, extraUserAttributes(user));
    }).spread(function(user, extraAttributes) {
      return _.extend(user.toJSON(), extraAttributes);
    });
  },

  fetchForOther: function(id) {
    return User.find(id, {
      withRelated: ['skills', 'organizations']
    }).then(function(user) {
      return Promise.join(user, extraUserAttributes(user));
    }).spread(function(user, extraAttributes) {
      return _.chain(user.attributes)
        .pick([
          'id', 'name', 'avatar_url', 'bio',
          'twitter_name', 'linkedin_url', 'facebook_url'
        ])
        .extend(extraAttributes).value();
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
  }

});
