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

  create: function (userId, postId, options) {
    if (!options) options = {}
    return new Follow({
      post_id: postId,
      date_added: new Date(),
      user_id: userId,
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
