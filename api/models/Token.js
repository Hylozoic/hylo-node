module.exports = bookshelf.Model.extend({
  tableName: 'tokens',

  user: function () {
    return this.belongsTo(User, 'user_id')
  }
}, {
  findForUser: function (userId) {
    return Token.where({user_id: userId }).fetch()
  }
})
