module.exports = bookshelf.Model.extend({
  tableName: 'stripe_accounts',
  requireFetch: false,

  user: function() {
    return this.hasOne(User)
  }
})
