module.exports = bookshelf.Model.extend({
  tableName: 'posts_users',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {'users.active': true}})
  },

  setToNow: function (trx) {
    return this.save({
      last_read_at: new Date()
    }, { patch: true, transacting: trx })
  }
}, {
  findOrCreate: function (userId, postId, opts = {}) {
    const { transacting } = opts
    return this.query({where: {user_id: userId, post_id: postId}})
    .fetch()
    .then(lastRead => lastRead || new this({
      post_id: postId,
      last_read_at: opts.date || new Date(),
      user_id: userId
    }).save(null, {transacting}))
  }
})
