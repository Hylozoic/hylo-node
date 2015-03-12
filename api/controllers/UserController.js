/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

module.exports = {

  status: function(req, res) {
    var playSession = new PlaySession(req);
    if (playSession.isValid()) {
      playSession.fetchUser().then(function(user) {
        if (user) {
          res.ok({signedIn: true});
        } else {
          res.ok({signedIn: false});
        }
      });
      return;
    }

    res.ok({signedIn: false});
  },

  findSelf: function(req, res) {
    Onboarding.maybeStart(req.session.userId)
    .then(function() {
      return User.fetchForSelf(req.session.userId);
    }).then(function(attributes) {
      res.ok(_.extend(attributes, {provider_key: req.session.userProvider}));
    }).catch(res.serverError.bind(res));
  },

  findOne: function(req, res) {
    User.fetchForOther(req.param('userId')).then(function(attributes) {
      res.ok(attributes);
    }).catch(res.serverError.bind(res));
  },

  contributions: function(req, res) {
    var params = _.pick(req.allParams(), ['userId', 'limit', 'start']),
      limit = params.limit ? params.limit : 15,
      start = params.start ? params.start : 0,
      userId = params.userId,
      isSelf = req.session.userId === userId;

    Promise.method(function() {
      if (!isSelf) return Membership.activeCommunityIds(req.session.userId);
    })().then(function(communityIds) {

      Contribution.query(function(qb) {
        qb.orderBy("date_contributed");
        qb.limit(limit);
        qb.offset(start);
        qb.join("post", "post.id", "=", "contributor.post_id");
        qb.where({user_id: userId});

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");
          qb.whereIn("community.id", communityIds);
        }

        qb.where({"post.active": true});

      }).fetchAll({
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
    var params = _.pick(req.allParams(), ['userId', 'limit', 'start']),
      limit = params.limit ? params.limit : 15,
      start = params.start ? params.start : 0,
      userId = params.userId,
      isSelf = req.session.userId === userId;

    Promise.method(function() {
      if (!isSelf) return Membership.activeCommunityIds(req.session.userId);
    })().then(function(communityIds) {

      Thank.query(function(qb) {
        qb.orderBy("date_thanked");
        qb.limit(limit);
        qb.offset(start);
        qb.join("comment", "comment.id", "=", "thank_you.comment_id");
        qb.join("post", "post.id", "=", "comment.post_id");

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");
          qb.whereIn("community.id", communityIds);
        }

        qb.where({"comment.active": true, "post.active": true});
      }).fetchAll({
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
      'bio', 'avatar_url', 'banner_url', 'twitter_name', 'linkedin_url', 'facebook_url',
      'email', 'send_email_preference', 'daily_digest', 'work', 'intention', 'extra_info'
    ]);

    User.find(req.param('userId'))
    .tap(function(user) {
      var newEmail = attrs.email, oldEmail = user.get('email');
      if (newEmail && newEmail != oldEmail) {
        if (!validator.isEmail(newEmail)) {
          throw new Error('invalid-email');
        }
        return User.isEmailUnique(newEmail, oldEmail).then(function(isUnique) {
          if (!isUnique) throw new Error('duplicate-email');
        });
        attrs.email_validated = false;
      }
    })
    .then(function(user) {
      user.setSanely(attrs);

      var promises = [];

      if (!_.isEmpty(user.changed))
        promises.push(user.save(user.changed, {patch: true}));

      _.each([
        ['skills', Skill],
        ['organizations', Organization],
        ['phones', UserPhone],
        ['emails', UserEmail],
        ['websites', UserWebsite]
      ], function(model) {
        var param = req.param(model[0]);
        if (param) promises.push(model[1].update(param, user.id));
      });

      return Promise.all(promises);

    }).then(function() {
      res.ok({});
    }).catch(function(err) {
      if (_.contains(['invalid-email', 'duplicate-email'], err.message)) {
        res.badRequest(req.__(err.message));
      } else {
        res.serverError(err);
      }
    });
  }

};

