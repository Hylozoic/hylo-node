/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  findOne: function(req, res) {
    Community.withId(req.param('id')).then(function(community) {
      Respond.with(community, res);
    })
  },

  sendInvites: function(req, res) {
    Respond.with({error: 'TODO'}, res);
  }

};

