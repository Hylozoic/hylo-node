module.exports = bookshelf.Model.extend({
  tableName: 'event_responses',

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {active: true}})
  }
}, {
  create: function (postId, options) {
    return new EventResponse({
      post_id: postId,
      user_id: options.responderId
    }).save(null, _.pick(options, 'transacting'))
  }
})
