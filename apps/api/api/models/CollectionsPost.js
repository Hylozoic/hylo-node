module.exports = bookshelf.Model.extend({
  tableName: 'collections_posts',
  requireFetch: false,
  hasTimestamps: true,

  collection: function () {
    return this.belongsTo(Collection, 'collection_id')
  },

  post: function () {
    return this.belongsTo(Post, 'post_id')
  },

  user: function () {
    return this.belongsTo(User, 'user_id')
  }
}, {

  create: async function (attrs) {
    const { groupId, order, postId, userId } = attrs

    const cp = await this.forge({
      group_id: groupId,
      order,
      post_id: postId,
      user_id: userId
    }).save()

    return cp
  },

  find: function (id) {
    if (!id) return Promise.resolve(null)
    return CollectionsPost.where({ id }).fetch()
  }

})
