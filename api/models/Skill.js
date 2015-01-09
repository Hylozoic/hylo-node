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

  batchCreate: function(skills, userId) {
    // for each skill
    // create if it doesn't already exist
    // link to user

  }

});