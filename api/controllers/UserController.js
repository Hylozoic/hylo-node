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
    var params = _.pick(req.allParams(), ['id', 'limit', 'start']),
      limit = params.limit ? params.limit : 15,
      start = params.start ? params.start : 0;

    var userId = params.id;

    var isSelf = req.session.user.id === userId;

    User.find(userId).then(function(user) {
      user.contributions().query(function(qb) {
        qb.orderBy("date_contributed");
        qb.limit(limit);
        qb.offset(start);

        if (!isSelf) {
          qb.join("post", "post.id", "=", "contributor.post_id");
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");

          var curUserActiveMembershipsSubQuery = bookshelf.knex.select("community_id")
              .from("users_community")
              .where("users_id", "=", req.session.user.id)
              .where("active", "=", true);

          qb.whereIn("community.id", curUserActiveMembershipsSubQuery);
        }
      }).fetch({
        withRelated: [
          {
            "post.creator": function(qb) {
              qb.column("id", "name", "avatar_url");
            },
            "post": function (qb) {
              qb.column("id", "name", "creator_id", "type");
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
    var params = _.pick(req.allParams(), ['id', 'limit', 'start']),
      limit = params.limit ? params.limit : 15,
      start = params.start ? params.start : 0;

    var userId = params.id;

    var isSelf = req.session.user.id === userId;

    User.find(userId).then(function(user) {
      user.thanks().query(function(qb) {
        qb.orderBy("date_thanked");
        qb.limit(limit);
        qb.offset(start);

        if (!isSelf) {
          qb.join("comment", "comment.id", "=", "thank_you.comment_id");
          qb.join("post", "post.id", "=", "comment.post_id");
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");

          var curUserActiveMembershipsSubQuery = bookshelf.knex.select("community_id")
            .from("users_community")
            .where("users_id", "=", req.session.user.id)
            .where("active", "=", true);

          qb.whereIn("community.id", curUserActiveMembershipsSubQuery);
        }
      }).fetch({
        withRelated: [
          {
            "thankedBy": function(qb) {
              qb.column("id", "name", "avatar_url");
            },
            "comment": function(qb) {
              qb.column("id", 'comment_text', 'post_id')
            },
            "comment.post.creator": function (qb) {
              qb.column("id", "name", "avatar_url");
            },
            "comment.post": function (qb) {
              qb.column("id", "name", "creator_id", "type");
            },
            "comment.post.communities": function(qb) {
              qb.column("id", "name");
            }
          }
        ]
      }).then(function(thanks) {
        res.ok(thanks);
      });
    });
  },

  update: function(req, res) {

  }

};

