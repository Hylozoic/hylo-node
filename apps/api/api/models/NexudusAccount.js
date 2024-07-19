module.exports = bookshelf.Model.extend({
  tableName: 'nexudus_accounts',
  requireFetch: false,

  community: function () {
    return this.belongsTo(Community)
  },

  decryptedPassword: function () {
    return this.get('password')
  }
}, {

})
