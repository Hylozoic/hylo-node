module.exports = bookshelf.Model.extend({
  tableName: 'users_org',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }
})