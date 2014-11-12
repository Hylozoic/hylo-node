/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  findOne: function(req, res) {
    User.withId(req.param('id')).then(function(user) {
      Respond.with(user, res);
    })
  }

};

