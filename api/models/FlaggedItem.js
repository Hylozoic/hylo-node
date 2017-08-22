module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',

  user: function () {
    return this.belongsTo(User, 'user_id')
  }

})
