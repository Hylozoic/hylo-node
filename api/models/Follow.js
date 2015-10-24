module.exports = bookshelf.Model.extend({
  tableName: 'follower',

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {active: true}})
  }
}, {
  create: function (userId, postId, options) {
    if (!options) options = {}
    return new Follow({
      post_id: postId,
      date_added: new Date(),
      user_id: userId,
      added_by_id: options.addedById
    }).save(null, _.pick(options, 'transacting'))
  }
})
