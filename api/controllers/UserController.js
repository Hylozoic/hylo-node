/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  findOne: function(req, res) {
    User.where({id: req.param('id')}).fetch({
      withRelated: [
        'memberships',
        'memberships.community',
        'skills',
        'organizations'
      ]
    }).then(function(user) {
      res.ok(_.extend(user.toJSON(), {
        skills: _.map(user.relations.skills.models, function(model) {
          return model.attributes.skill_name;
        }),
        organizations: _.map(user.relations.organizations.models, function(model) {
          return model.attributes.org_name;
        })
      }));
    });
  }

};

