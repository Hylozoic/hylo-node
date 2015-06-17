/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var validator = require('validator');

var communityAttributes = function(community, membership, memberCount, isAdmin) {
  var attrs = community.toJSON(),
    network = community.relations.network;

  if (!isAdmin && (!membership || !membership.hasModeratorRole())) {
    delete attrs.beta_access_code;
  }

  if (network) {
    attrs.network = network.pick('id', 'name', 'slug');
  }

  if (memberCount != undefined) {
    attrs.memberCount = memberCount;
  }

  return _.extend(
    _.omit(attrs, 'memberships'),
    {
      id: Number(community.id), // FIXME this isn't necessary post-Scala
      canModerate: membership && membership.hasModeratorRole()
    }
  );
};

module.exports = {

  find: function(req, res) {
    Community.fetchAll().then(res.ok).catch(res.serverError);
  },

  findOne: function(req, res) {
    var community = res.locals.community;

    if (!req.session.userId) {
      var limitedAttributes = _.merge(
        res.locals.community.pick('id', 'name', 'avatar_url', 'banner_url', 'description'),
        {readonly: true}
      );
      return res.ok(limitedAttributes);
    }

    return Promise.method(() => community.get('network_id') ? community.load('network') : null)()
    .then(() => res.ok(communityAttributes(community, res.locals.membership, undefined, Admin.isSignedIn(req))))
    .catch(res.serverError);
  },

  update: function(req, res) {
    var whitelist = [
        'banner_url', 'avatar_url', 'name', 'description', 'settings',
        'welcome_message', 'leader_id', 'beta_access_code'
      ],
      attributes = _.pick(req.allParams(), whitelist),
      community = new Community({id: req.param('communityId')});

    community.save(attributes, {patch: true})
    .then(() => res.ok({}))
    .catch(res.serverError);
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

      return Promise.map(emails, function(email) {
        if (!validator.isEmail(email)) {
          return {email: email, error: "not a valid email address"};
        }

        return Invitation.createAndSend({
          email:       email,
          userId:      req.session.userId,
          communityId: community.id,
          message:     RichText.markdown(req.param('message')),
          moderator:   req.param('moderator'),
          subject:     req.param('subject')
        }).then(function() {
          return {email: email, error: null};
        }).catch(function(err) {
          return {email: email, error: err.message};
        });
      });

    })
    .then(results => res.ok({results: results}));
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
    Membership.setModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  removeModerator: function(req, res) {
    Membership.removeModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  findMembers: function(req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return;
    }

    var options = _.defaults(
      _.pick(req.allParams(), 'autocomplete', 'limit', 'offset', 'start_time', 'end_time'),
      {
        limit: 10,
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
            id: Number(user.id), // FIXME this shouldn't be forced to be a number
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

  joinWithCode: function(req, res) {
    Community.where('beta_access_code', req.param('code')).fetch()
    .tap(community => Membership.create(req.session.userId, community.id))
    .then(community => res.ok(community.pick('id', 'slug')))
    .catch(err => {
      if (err.message && err.message.contains('duplicate key value')) {
        res.ok(community.pick('id', 'slug'));
      } else {
        res.serverError(err);
      }
    });
  },

  leave: function(req, res) {
    res.locals.membership.destroyMe()
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  removeMember: function(req, res) {
    Membership.where({
      users_id: req.param('userId'),
      community_id: req.param('communityId')
    }).query().update({
      active: false,
      deactivated_at: new Date(),
      deactivator_id: req.session.userId
    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  validate: function(req, res) {
    var allowedColumns = ['name', 'slug', 'beta_access_code'],
      allowedConstraints = ['exists', 'unique'],
      params = _.pick(req.allParams(), 'constraint', 'column', 'value');

    // prevent SQL injection
    if (!_.include(allowedColumns, params.column))
      return res.badRequest(format('invalid value "%s" for parameter "column"', params.column));

    if (!params.value)
      return res.badRequest('missing required parameter "value"');

    if (!_.include(allowedConstraints, params.constraint))
      return res.badRequest(format('invalid value "%s" for parameter "constraint"', params.constraint));

    var statement = format('lower(%s) = lower(?)', params.column);
    Community.query().whereRaw(statement, params.value).count()
    .then(function(rows) {
      var data;
      if (params.constraint === 'unique') {
        data = {unique: parseInt(rows[0].count) === 0};
      } else if (params.constraint === 'exists') {
        var exists = parseInt(rows[0].count) >= 1;
        data = {exists: exists};
      }
      res.ok(data);
    })
    .catch(res.serverError.bind(res));
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
      .tap(() => Membership.create(req.session.userId, community.id, {
        role: Membership.MODERATOR_ROLE,
        transacting: trx
      }));
    })
    // The assets were uploaded to /community/new, since we didn't have an id;
    // copy them over to /community/:id now
    .tap(community => Queue.classMethod('Community', 'copyAssets', {communityId: community.id}))
    // FIXME this additional lookup wouldn't be necessary
    // if we had a Membership instance from the previous
    // step. But the absence of an id column on the table
    // doesn't play nice with Bookshelf.
    .then(() => Membership.where({
      users_id: req.session.userId,
      community_id: community.id
    }).fetch({withRelated: ['community']}))
    .then(res.ok)
    .catch(res.serverError);
  },

  findForNetwork: function(req, res) {
    Community.where('network_id', req.param('networkId'))
    .fetchAll({withRelated: ['memberships']})
    .then(communities => communities.map(c => {
      var membership = c.relations.memberships.find(m => m.get('users_id') === req.session.userId);
      return communityAttributes(c, membership, c.relations.memberships.length);
    }))
    .then(communities => _.sortBy(communities, c => -c.memberCount))
    .then(res.ok)
    .catch(res.serverError);
  }

};