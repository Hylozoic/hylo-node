/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var util    = require('util'),
  validator = require('validator');

module.exports = {

  findOne: function(req, res) {
    Community.withId(req.param('id')).then(function(community) {
      res.ok(community);
    });
  },

  invite: function(req, res) {
    Community.withId(req.param('id')).then(function(community) {

      var emails = (req.param('emails') || '').split(',').map(function(email) {
        return email.trim();
      });

      if (!_.all(emails, validator.isEmail)) {
        return res.badRequest({error: "invalid email"});
      }

      async.map(emails, function(email, done) {

        Invitation.create({
          user: req.session.user,
          email: email,
          community: community
        })
        .then(function(invitation) {
          var link = util.format(
            "http://%s/community/invite/%s",
            process.env.DOMAIN, invitation.get('token')
          );

          Email.sendInvitation(email, {
            recipient: email,
            community_name: community.get('name'),
            invite_link: link
          }, done);
        });

      }, function(err, results) {
        if (err) {
          sails.log.error(err); // TODO notify rollbar
          return res.badRequest();
        }
        res.ok({sent: results.length});
      });
    });
  }

};

