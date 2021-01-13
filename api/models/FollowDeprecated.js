module.exports = bookshelf.Model.extend({
  tableName: 'follows',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {'users.active': true}})
  }
}, {
  Role: {
    DEFAULT: 0,
    MODERATOR: 1
  },

  create: function (userId, postId, commentId, { transacting, addedById } = {}) {
    return User.where({id: userId}).count()
    .then(count => Number(count) === 0 ? null : Follow.forge({
      post_id: postId,
      comment_id: commentId,
      added_at: new Date(),
      user_id: userId,
      added_by_id: addedById
    }).save(null, {transacting}))
  },

  exists: function (userId, postId) {
    return Follow.query()
    .where({user_id: userId, post_id: postId})
    .count()
    .then(rows => rows[0].count >= 1)
  }
})
