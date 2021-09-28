module.exports = bookshelf.Model.extend({
  tableName: 'event_responses',
  requireFetch: false,
  hasTimestamps: true,

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User).query({where: {'users.active': true}})
  }
}, {
  create: function (postId, options) {
    return new EventResponse({
      post_id: postId,
      user_id: options.responderId,
      response: options.response,
      created_at: new Date()
    }).save(null, _.pick(options, 'transacting'))
  }
})
