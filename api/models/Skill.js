module.exports = bookshelf.Model.extend({
  tableName: 'users_skill',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }

});