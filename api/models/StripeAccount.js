module.exports = bookshelf.Model.extend({
  tableName: 'stripe_accounts',

  user: function() {
    return this.hasOne(User)
  }
})
