/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: 'string',
    email: 'string',
    communities: {
      collection: 'community',
      via: 'users',
      through: 'communityuser'
    },
    memberships: {
      collection: 'membership',
      via: 'user'
    },
    linkedAccounts: {
      collection: 'linkedAccount',
      via: 'user'
    }
  },

  tableName: 'users',
  autoCreatedAt: false,
  autoUpdatedAt: false,

  setModeratorRole: function(user, community, enabled, cb) {
    if (typeof user === 'object') user = user.id;
    if (typeof community === 'object') community = community.id;

    Membership.findOne({user: user, community: community}).exec(function(err, membership) {
      if (err) return cb(err);

      membership.role = enabled ? 1 : 0;
      membership.save(); // FIXME this doesn't work -- complains about primary key
      cb(null, membership);
    })
  }

};

