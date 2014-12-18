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

  contributions: function(req, res) {
    var userId = req.param('id');

    User.find(userId).then(function(user) {
      user.contributions().query(function(qb) {
        qb.orderBy("date_contributed");
      }).fetch({
        withRelated: [
          {
            "post.creator": function(qb) {
              qb.column("id", "name", "avatar_url");
            },
            "post": function (qb) {
              qb.column("id", "name", "creator_id");
            },
            "post.communities": function(qb) {
              qb.column("id", "name");
            }
          }
        ]
      }).then(function(contributions) {
        res.ok(contributions);
      });
    });
  },

  thanks: function(req, res) {

  },

  update: function(req, res) {

  }

};

