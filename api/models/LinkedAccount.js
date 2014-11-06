module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',

  user: function() {
    return this.belongsTo(User);
  }
});