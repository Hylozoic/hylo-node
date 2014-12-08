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
  }

};

