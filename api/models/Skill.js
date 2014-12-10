module.exports = bookshelf.Model.extend({
  tableName: 'users_skill',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }

}, {

  simpleList: function(user) {
    return _.map(user.relations.skills.models, function(model) {
      return model.attributes.skill_name;
    });
  }

});