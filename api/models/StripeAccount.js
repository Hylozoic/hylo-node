module.exports = bookshelf.Model.extend({
  tableName: 'stripe_accounts',
  requireFetch: false,

  group: function() {
    return this.hasOne(Group)
  },

  user: function() {
    return this.hasOne(User)
  }
})
