import { isEmpty } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'posts_users',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  user: function () {
    return this.belongsTo(User)
  },

  async updateAndSave (attrs, { transacting } = {}) {
    for (let key in attrs) {
      this.set(key, attrs[key])
    }

    if (!isEmpty(this.changed)) return this.save(null, {transacting})
    return this
  },
}, {
  find: function (postId, userId, options) {
    return PostUser.where({ post_id: postId, user_id: userId }).fetch(options)
  },

  followedPostIds: function (userId) {
    return PostUser.query().select('post_id')
      .where({ 'posts_users.user_id': userId, following: true, 'posts_users.active': true })
  }

})
