import { isEmpty } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'posts_users',
  requireFetch: false,
  hasTimestamps: true,

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
  clickthroughModeration: function ({ userId, postId }) {
    return bookshelf.knex.raw(`
      INSERT INTO posts_users (user_id, post_id, clickthrough)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, post_id)
      DO UPDATE SET clickthrough = EXCLUDED.clickthrough
    `, [userId, postId, true])
  },

  find: function (postId, userId, options) {
    return PostUser.where({ post_id: postId, user_id: userId }).fetch(options)
  },

  followedPostIds: function (userId) {
    return PostUser.query().select('post_id')
      .where({ 'posts_users.user_id': userId, 'posts_users.following': true, 'posts_users.active': true })
  },

  whereUnread (userId, { afterTime } = {}) {
    return this.query(q => {
      q.join('posts', 'posts.id', 'posts_users.post_id')

      q.where({
        'posts_users.user_id': userId,
        'posts_users.active': true,
        'posts_users.following': true
      })

      if (afterTime) q.where('posts.updated_at', '>', afterTime)

      q.where(q2 => {
        q2.whereNull("posts_users.last_read_at")
          .orWhereRaw(`posts_users.last_read_at < posts.updated_at`)
      })
    })
  }

})
