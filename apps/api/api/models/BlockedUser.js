const { GraphQLYogaError } = require('@graphql-yoga/node')

/* eslint-disable camelcase */
module.exports = bookshelf.Model.extend({
  tableName: 'blocked_users',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  blockedUser: function () {
    return this.belongsTo(User, 'blocked_user_id')
  }

}, {

  create: function (userId, blockedUserId) {
    if (blockedUserId === User.AXOLOTL_ID) {
      throw new GraphQLYogaError('cannot block Hylo the Axolotl')
    }

    if (userId === blockedUserId) {
      throw new GraphQLYogaError('blocked_user_id cannot equal user_id')
    }

    if (!userId || !blockedUserId) {
      throw new GraphQLYogaError('must provide a user_id and blocked_user_id')
    }

    return this.find(userId, blockedUserId)
    .then(existing => {
      if (existing) return existing

      return new BlockedUser({
        user_id: userId,
        blocked_user_id: blockedUserId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .save()
    })
  },

  find: function (user_id, blocked_user_id) {
    if (!user_id) throw new GraphQLYogaError('Parameter user_id must be supplied.')
    return BlockedUser.where({user_id, blocked_user_id}).fetch()
  },

  blockedFor: function (userId) {
    return bookshelf.knex.raw(`
      SELECT user_id
      FROM blocked_users
      WHERE blocked_user_id = ?
      UNION
      SELECT blocked_user_id
      FROM blocked_users
      WHERE user_id = ?
    `, [userId, userId])
  }
})
