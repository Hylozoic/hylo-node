/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

var communityAttributes = function(community, membership) {
  return _.extend(community.attributes, {
    canModerate: membership && membership.hasModeratorRole(),
    id: Number(community.id)
  })
}

module.exports = {

  findDefault: function(req, res) {
    req.session.user.communities().fetchOne().then(function(community) {
      Membership.find(req.session.user.id, community.id).then(function(membership) {
        res.ok(communityAttributes(community, membership));
      })
    })
  },

  findOne: function(req, res) {
    Community.find(req.param('id')).then(function(community) {
      Membership.find(req.session.user.id, community.id).then(function(membership) {
        res.ok(communityAttributes(community, membership));
      });
    });
  },

  update: function(req, res) {
    var whitelist = ['banner_url', 'avatar_url', 'name', 'description'],
      attributes = _.pick(req.allParams(), whitelist),
      community = new Community({id: req.param('id')});

    community.save(attributes, {patch: true}).then(function(community) {
      res.ok({});
    })
  },

  invite: function(req, res) {
    Community.find(req.param('id')).then(function(community) {

      var emails = (req.param('emails') || '').split(',').map(function(email) {
        return email.trim();
      });

      async.map(emails, function(email, cb) {
        if (!validator.isEmail(email)) {
          return cb(null, {email: email, error: "not a valid email address"});
        }

        Invitation.createAndSend({
          user: req.session.user,
          email: email,
          community: community,
          moderator: req.param('moderator')
        }, function(err) {
          return cb(null, {email: email, error: (err ? err.message : null)});
        });

      }, function(err, results) {
        res.ok({results: results});
      });

    });
  },

  findModerators: function(req, res) {
    Community.find(req.param('id')).then(function(community) {
      return community.moderators().fetch();
    }).then(function(moderators) {
      res.ok(moderators.map(function(user) {
        return {
          id: user.id,
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        };
      }));
    });
  },

  addModerator: function(req, res) {
    Membership.setModeratorRole(req.param('user_id'), req.param('id')).then(function() {
      res.ok({});
    });
  },

  removeModerator: function(req, res) {
    Membership.removeModeratorRole(req.param('user_id'), req.param('id')).then(function() {
      res.ok({});
    });
  },

  findMembers: function(req, res) {
    var params = _.pick(req.allParams(), ['search', 'id', 'limit', 'offset']);

    Community.members(params.id, params.search, {limit: params.limit, offset: params.offset}).then(function(users) {

      res.ok(users.map(function(user) {
        return {
          id: user.id,
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        };
      }));

    });
  }

};

