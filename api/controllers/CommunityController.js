/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var format = require('util').format,
  validator = require('validator');

var communityAttributes = function(community, membership) {
  return _.extend(community.attributes, {
    canModerate: membership && membership.hasModeratorRole(),
    id: Number(community.id)
  })
}

module.exports = {

  findDefault: function(req, res) {
    User.find(req.session.userId).then(function(user) {
      return user.communities().query(function(qb) { qb.orderBy('id', 'desc') }).fetchOne();
    })
    .then(function(community) {
      if (!community) return res.ok({});

      Membership.find(req.session.userId, community.id).then(function(membership) {
        res.ok(communityAttributes(community, membership));
      })
    })
  },

  findOne: function(req, res) {
    Community.find(req.param('communityId')).then(function(community) {
      Membership.find(req.session.userId, community.id).then(function(membership) {
        res.ok(communityAttributes(community, membership));
      });
    });
  },

  update: function(req, res) {
    var whitelist = ['banner_url', 'avatar_url', 'name', 'description', 'settings'],
      attributes = _.pick(req.allParams(), whitelist),
      community = new Community({id: req.param('communityId')});

    community.save(attributes, {patch: true}).then(function(community) {
      res.ok({});
    }).catch(function(err) {
      res.serverError(err);
    })
  },

  invite: function(req, res) {
    Community.find(req.param('communityId'))
    .then(function(community) {

      var emails = (req.param('emails') || '').split(',').map(function(email) {
        var trimmed = email.trim(),
          matchLongFormat = trimmed.match(/.*<(.*)>/);

        if (matchLongFormat) return matchLongFormat[1];
        return trimmed;
      });

      var marked = require('marked');
      marked.setOptions({
        gfm: true,
        breaks: true
      });

      var message = marked(req.param('message') || '');

      return Promise.map(emails, function(email) {
        if (!validator.isEmail(email)) {
          return {email: email, error: "not a valid email address"};
        }

        return Invitation.createAndSend({
          email:       email,
          userId:      req.session.userId,
          communityId: community.id,
          message:     message,
          moderator:   req.param('moderator'),
          subject:     req.param('subject')
        }).then(function() {
          return {email: email, error: null};
        }).catch(function(err) {
          return {email: email, error: err.message};
        });
      });

    })
    .then(function(results) {
      res.ok({results: results});
    });
  },

  findModerators: function(req, res) {
    Community.find(req.param('communityId')).then(function(community) {
      return community.moderators().fetch();
    }).then(function(moderators) {
      res.ok(moderators.map(function(user) {
        return {
          id: user.id,
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        };
      }));
    });
  },

  addModerator: function(req, res) {
    Membership.setModeratorRole(req.param('userId'), req.param('communityId')).then(function() {
      res.ok({});
    });
  },

  removeModerator: function(req, res) {
    Membership.removeModeratorRole(req.param('userId'), req.param('communityId')).then(function() {
      res.ok({});
    });
  },

  findMembers: function(req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return;
    }

    var options = _.defaults(
      _.pick(req.allParams(), 'search', 'autocomplete', 'limit', 'offset', 'start_time', 'end_time'),
      {
        limit: 1000,
        communities: [req.param('communityId')]
      }
    );

    if (req.param('with')) {
      options.withRelated = _.flatten([req.param('with')]);
    }

    Search.forUsers(options).fetchAll(_.pick(options, 'withRelated'))
    .then(function(users) {

      res.ok(users.map(function(user) {
        var attributes = _.merge(
          _.pick(user.attributes,
            'name', 'avatar_url', 'bio', 'facebook_url', 'linkedin_url', 'twitter_name'),
          {
            id: Number(user.id),
            public_email: user.encryptedEmail(),
            total: user.get('total')
            // FIXME: total shouldn't go here, but this endpoint is also used
            // for autocomplete, and the Angular resource is already configured
            // to expect an array response, so we can't refactor this response
            // without changing the frontend
          }
        );

        if (options.withRelated) {
          _.each(options.withRelated, function(relation) {
            var model;
            switch (relation) {
              case 'skills': model = Skill; break;
              case 'organizations': model = Organization;
            }
            attributes[relation] = model.simpleList(user.relations[relation]);
          });
        }

        return attributes;
      }));

    });
  },

  removeMember: function(req, res) {
    res.locals.membership.destroyMe()
    .then(function() {
      res.ok({});
    })
    .catch(res.serverError.bind(res));
  },

  validate: function(req, res) {
    var allowedColumns = ['name', 'slug', 'beta_access_code'],
      params = _.pick(req.allParams(), 'constraint', 'column', 'value');

    if (params.constraint === 'unique') {
      // this whitelist prevents SQL injection
      if (!_.contains(allowedColumns, params.column))
        return res.badRequest(format('invalid value "%s" for parameter "column"', params.column));

      if (!params.value)
        return res.badRequest('missing required parameter "value"');

      var statement = format('lower(%s) = lower(?)', params.column);

      Community.query().whereRaw(statement, params.value).count()
      .then(function(rows) {
        res.ok({unique: parseInt(rows[0].count) == 0});
      })
      .catch(res.serverError.bind(res));

    } else {
      res.badRequest(format('invalid value "%s" for parameter "constraint"', params.constraint));
    }
  },

  create: function(req, res) {
    var attrs = _.pick(req.allParams(),
      'name', 'description', 'slug', 'category',
      'beta_access_code', 'banner_url', 'avatar_url');

    var community = new Community(_.merge(attrs, {
      date_created: new Date(),
      created_by_id: req.session.userId
    }));

    if (process.env.NODE_ENV) {
      community.set('leader_id', 21);
      community.set('welcome_message', "Thank you for joining us here at Hylo. " +
        "Through our communities, we can find everything we need. If we share " +
        "with each other the unique gifts and intentions we each have, we can " +
        "create extraordinary things. Let's get started!");
    }

    bookshelf.transaction(function(trx) {
      return community.save(null, {transacting: trx})
      .tap(function() {
        return Membership.create(req.session.userId, community.id, {
          role: Membership.MODERATOR_ROLE,
          transacting: trx
        });
      });
    })
    .then(function() {
      // FIXME this additional lookup wouldn't be necessary
      // if we had a Membership instance from the previous
      // step. But the absence of an id column on the table
      // doesn't play nice with Bookshelf.
      return Membership.where({
        users_id: req.session.userId,
        community_id: community.id
      }).fetch({withRelated: ['community']});
    })
    .then(function(membership) {
      res.ok(membership);
    })
    .catch(res.serverError.bind(res));
  }

};