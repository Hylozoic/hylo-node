/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var Promise = require('bluebird'),
  validator = require('validator');

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
        qb.join("post", "post.id", "=", "contributor.post_id");

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");

          qb.whereIn("community.id", Membership.activeCommunityIds(req.session.user.id));
        }

        qb.where({"post.active": true});

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
        qb.join("comment", "comment.id", "=", "thank_you.comment_id");
        qb.join("post", "post.id", "=", "comment.post_id");

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");

          qb.whereIn("community.id", Membership.activeCommunityIds(req.session.user.id));
        }

        qb.where({"comment.active": true, "post.active": true});
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
    var attrs = _.pick(req.allParams(), [
      'bio', 'avatar_url', 'banner_url', 'twitter_name', 'linkedin_url', 'email'
    ]);

    User.find(req.param('id'))
    .tap(function(user) {
      var newEmail = attrs.email, oldEmail = user.get('email');
      if (newEmail && newEmail != oldEmail) {
        if (!validator.isEmail(newEmail)) {
          throw new Error('invalid_email');
        }
        return User.isEmailUnique(newEmail, oldEmail).then(function(isUnique) {
          if (!isUnique) throw new Error('duplicate_email');
        });
      }
      attrs.email_validated = false;
    })
    .then(function(user) {
      user.setSanely(attrs);

      var promises = [user.save()],
        skills = req.param('skills'),
        organizations = req.param('organizations');

      if (skills)
        promises.push(Skill.update(skills, user.id));

      if (organizations)
        promises.push(Organizations.update(organizations, user.id));

      return Promise.all(promises);

    }).then(function() {
      res.ok({});
    }).catch(function(err) {
      if (err.message == 'invalid_email') {
        res.badRequest({message: 'That email address is not valid.'});
      } else if (err.message == 'duplicate_email') {
        res.badRequest({message: 'That email address is already in use.'});
      } else {
        res.serverError(err);
      }
    });
  }

};

