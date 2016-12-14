module.exports = bookshelf.Model.extend({
  tableName: 'follows',

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {active: true}})
  }
}, {
  Role: {
    DEFAULT: 0,
    MODERATOR: 1
  },

  create: function (user_id, post_id, comment_id, options = {}) {
    return new Follow({
      post_id,
      comment_id,
      added_at: new Date(),
      user_id: user_id,
      added_by_id: options.addedById
    }).save(null, _.pick(options, 'transacting'))
  },

  exists: function (userId, postId) {
    return Follow.query()
    .where({user_id: userId, post_id: postId})
    .count()
    .then(rows => rows[0].count >= 1)
  }
})
