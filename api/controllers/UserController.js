/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

var findContext = function(req) {
  var projectId = req.param('projectId');
  if (projectId) {
    return Project.find(projectId).then(project => {
      if (!project) return {};
      if (project.isPublic()) return {project: project};

      return ProjectInvitation.validate(projectId, req.param('projectToken'))
      .then(valid => (valid ? {project: project} : {}));
    });
  }

  if (req.session.invitationId) {
    return Invitation.find(req.session.invitationId, {withRelated: ['community']})
    .then(function(invitation) {
      return {community: invitation.relations.community, invitation: invitation};
    });
  }

  return Promise.props({community: Community.where({beta_access_code: req.param('code')}).fetch()});
};

module.exports = {

  create: function(req, res) {
    var params = _.pick(req.allParams(), 'name', 'email', 'password');

    return findContext(req)
    .then(ctx => {
      var attrs = _.merge(_.pick(params, 'name', 'email'), {
        community: (ctx.invitation ? null : ctx.community),
        account: {type: 'password', password: params.password}
      });

      return bookshelf.transaction(function(trx) {
        return User.create(attrs, {transacting: trx}).tap(function(user) {
          return Promise.join(
            Tour.startOnboarding(user.id, {transacting: trx}),
            (ctx.invitation ? ctx.invitation.use(user.id, {transacting: trx}) : null)
          );
        });
      });
    })
    .then(function(user) {
      if (req.param('login'))
        UserSession.login(req, user, 'password');

      res.ok({});
    })
    .catch(function(err) {
      res.status(422).send(err.detail ? err.detail : err);
    });
  },

  status: function(req, res) {
    res.ok({signedIn: UserSession.isLoggedIn(req)});
  },

  findSelf: function(req, res) {
    if (!req.session.userId)
      return res.ok({});

    return UserPresenter.fetchForSelf(req.session.userId, Admin.isSignedIn(req))
    .then(function(attributes) {
      res.ok(UserPresenter.presentForSelf(attributes, req.session));
    }).catch(res.serverError.bind(res));
  },

  findOne: function(req, res) {
    UserPresenter.fetchForOther(req.param('userId')).then(function(attributes) {
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

        qb.where({user_id: userId, "post.active": true});

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");
          qb.whereIn("community.id", communityIds);
        }
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

        qb.where({
          'comment.user_id': userId,
          "comment.active": true,
          "post.active": true
        });

        if (!isSelf) {
          qb.join("post_community", "post_community.post_id", "=", "post.id");
          qb.join("community", "community.id", "=", "post_community.community_id");
          qb.whereIn("community.id", communityIds);
        }
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
      'email', 'send_email_preference', 'daily_digest', 'work', 'intention', 'extra_info',
      'new_notification_count'
    ]);

    return User.find(req.param('userId'))
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
      // FIXME this should be in a transaction

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
        if (param) promises.push(model[1].update(_.flatten([param]), user.id));
      });

      var newPassword = req.param('password');
      if (newPassword) {
        promises.push(
          LinkedAccount.where({user_id: user.id, provider_key: 'password'}).fetch()
          .then(function(account) {
            if (account) return account.updatePassword(newPassword);
            return LinkedAccount.create(user.id, {type: 'password', password: newPassword});
          })
        );
      }

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
  },

  sendPasswordReset: function(req, res) {
    var email = req.param('email');
    User.where('email', email).fetch().then(function(user) {
      if (!user) {
        res.ok({error: 'no user'});
      } else {
        user.generateToken().then(function(token) {
          Queue.classMethod('Email', 'sendPasswordReset', {
            email: user.get('email'),
            templateData: {
              login_url: Frontend.Route.tokenLogin(user, token)
            }
          });
          res.ok({});
        });
      }
    })
    .catch(res.serverError.bind(res));
  },

  findForProject: function(req, res) {
    Search.forUsers({
      project: req.param('projectId'),
      sort: 'users.name',
      limit: req.param('limit') || 10,
      offset: req.param('offset') || 0
    })
    .fetchAll()
    .then(users => users.map(u => u.pick(UserPresenter.shortAttributes)))
    .then(res.ok)
    .catch(res.serverError);
  },

  findForCommunity: function(req, res) {
    if (TokenAuth.isAuthenticated(res)
      && !RequestValidation.requireTimeRange(req, res))
      return;

    var options = _.defaults(
      _.pick(req.allParams(), 'limit', 'offset', 'start_time', 'end_time'),
      {limit: 20, communities: [req.param('communityId')]}
    ), total;

    Search.forUsers(options).fetchAll({withRelated: ['skills', 'organizations']})
    .tap(users => total = users.first().get('total'))
    .then(users => users.map(user => _.merge(
      _.pick(user.attributes, UserPresenter.shortAttributes),
      {
        skills: Skill.simpleList(user.relations.skills),
        organizations: Organization.simpleList(user.relations.organizations),
        public_email: user.encryptedEmail()
      })))
    .then(list => ({people_total: total, people: list}))
    .then(res.ok)
    .catch(res.serverError);
  }

};

