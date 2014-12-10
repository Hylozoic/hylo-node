module.exports = bookshelf.Model.extend({
  tableName: 'users_org',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }
}, {

  simpleList: function(user) {
    return _.map(user.relations.organizations.models, function(model) {
      return model.attributes.org_name;
    });
  }

})