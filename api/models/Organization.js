module.exports = bookshelf.Model.extend({
  tableName: 'users_org',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }
}, {

  simpleList: function(collection) {
    return _.map(collection.models, function(model) {
      return model.attributes.org_name;
    });
  }

})