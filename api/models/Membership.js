module.exports = bookshelf.Model.extend({
  tableName: 'users_community',

  user: function() {
    return this.belongsTo(User, 'users_id');
  },

  community: function() {
    return this.belongsTo(Community);
  }

});