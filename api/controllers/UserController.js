/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  findSelf: function(req, res) {
    User.fetchForSelf(req.session.user.id).then(function(attributes) {
      res.ok(attributes);
    })
  },

  findOne: function(req, res) {
    User.fetchForOther(req.param('id')).then(function(attributes) {
      res.ok(attributes);
    })
  },

  update: function(req, res) {

  }

};

