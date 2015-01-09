var Promise = require('bluebird');

module.exports = bookshelf.Model.extend({
  tableName: 'users_skill',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }

}, {
  simpleList: function(collection) {
    return _.map(collection.models, function(model) {
      return model.attributes.skill_name;
    });
  },

  update: function(skills, userId) {
    return Skill.where({users_id: userId}).fetchAll().then(function(collection) {
      var existing = Skill.simpleList(collection),
        toAdd = _.difference(skills, existing),
        toRemove = _.difference(existing, skills),
        queries = [], q;

      if (toRemove.length > 0) {
        q = bookshelf.knex('users_skill').where('users_id', userId).whereIn('skill_name', toRemove).del();
        queries.push(q);
      }

      if (toAdd.length > 0) {
        var values = _.map(toAdd, function(name) {
          return {skill_name: name, users_id: userId};
        })
        q = bookshelf.knex('users_skill').insert(values);
        queries.push(q);
      }

      return Promise.all(queries);
    });
  }

});