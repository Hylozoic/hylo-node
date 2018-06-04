module.exports = bookshelf.Model.extend({
  tableName: 'nexudus_accounts',

  community: function () {
    return this.belongsTo(Community)
  },

  decryptedPassword: function () {
    // return PlayCrypto.decrypt(this.get('password'))
    return this.get('password')
  }
}, {

})
