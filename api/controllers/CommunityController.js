/**
 * CommunityController
 *
 * @description :: Server-side logic for managing communities
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var Promise = require('bluebird'),
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
      return user.communities().fetchOne();
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
    var whitelist = ['banner_url', 'avatar_url', 'name', 'description'],
      attributes = _.pick(req.allParams(), whitelist),
      community = new Community({id: req.param('communityId')});

    community.save(attributes, {patch: true}).then(function(community) {
      res.ok({});
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
    var options = _.defaults(
      _.pick(req.allParams(), 'search', 'limit', 'offset'),
      {limit: 1000}
    );

    if (req.param('with')) {
      options.withRelated = _.flatten([req.param('with')]);
    }

    Community.members(req.param('communityId'), options)
    .then(function(users) {

      res.ok(users.map(function(user) {
        var attributes = {
          id: Number(user.id),
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        };

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
  }

};