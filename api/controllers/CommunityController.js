/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  findOne: function(req, res) {
    Community.withId(req.param('id')).then(function(community) {
      res.ok(community);
    });
  },

  sendInvites: function(req, res) {
    res.ok({error: 'TODO'});
  }

};

