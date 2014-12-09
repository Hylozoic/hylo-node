/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

module.exports = {

  findOne: function(req, res) {
    Community.find(req.param('id')).then(function(community) {
      Membership.find(req.session.user.id, community.id).then(function(membership) {
        res.ok(_.extend(community.toJSON(), {
          canModerate: membership && membership.hasModeratorRole(),
          id: Number(community.id)
        }));
      });
    });
  },

  update: function(req, res) {
    var attributes = _.pick(req.allParams(), ['banner_url', 'avatar_url']),
      community = new Community({id: req.param('id')});

    community.save(attributes, {patch: true}).then(function(community) {
      res.ok(community);
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
    Community.find(req.param('id')).then(function(community) {

      return community.users().query(function(qb) {
        var search = req.param('search');
        if (search) {
          qb.where("name", "ILIKE", '%' + search + '%');
          qb.limit(10);
        }
      }).fetch();

    }).then(function(users) {

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

