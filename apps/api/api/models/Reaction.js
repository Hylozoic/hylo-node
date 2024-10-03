module.exports = bookshelf.Model.extend({
  tableName: 'reactions',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post, 'entity_id').where('reactions.entity_type', 'post')
  },
  comment: function () {
    return this.belongsTo(Comment, 'entity_id').where('reactions.entity_type', 'comment')
  },
  user: function () {
    return this.belongsTo(User, 'user_id')
  }

}, {

  /**
   * @param userId User ID to check which posts they reacted to
   * @param postIds List of Post ID's to check against
   * @returns a list of Reactions.
   */
  forUserInPosts: function (userId, postIds) {
    return bookshelf.knex('reactions').where({
      user_id: userId
    }).whereIn('entity_id', postIds)
  }
})
