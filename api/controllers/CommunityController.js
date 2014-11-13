/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

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

        Invitation.createAndSend({
          user: req.session.user,
          email: email,
          community: community
        }, done);

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

