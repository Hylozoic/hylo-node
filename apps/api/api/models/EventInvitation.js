const { GraphQLYogaError } = require('@graphql-yoga/node')

/* eslint-disable camelcase */
module.exports = bookshelf.Model.extend({
  tableName: 'event_invitations',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  inviter: function () {
    return this.belongsTo(User, 'inviter_id')
  },

  event: function () {
    return this.belongsTo(Post, 'event_id')
  }

}, {

  RESPONSE: {
    YES: 'yes',
    NO: 'no',
    INTERESTED: 'interested'
  },

  create: function ({userId, inviterId, eventId, response}, trxOpts) {
    if (!userId) {
      throw new GraphQLYogaError('must provide a user_id')
    }

    if (!eventId) {
      throw new GraphQLYogaError('must provide an event_id')
    }

    return this.find({userId, inviterId, eventId}, trxOpts)
    .then(existing => {
      if (existing) return existing

      return new EventInvitation({
        user_id: userId,
        inviter_id: inviterId,
        event_id: eventId,
        response,
        created_at: new Date(),
        updated_at: new Date()
      })
      .save(null, trxOpts)
    })
  },

  find: function ({ userId, inviterId, eventId }, opts) {
    if (!userId) throw new GraphQLYogaError('Parameter user_id must be supplied.')
    if (!eventId) throw new GraphQLYogaError('Parameter event_id must be supplied.')

    const conditions = {
      user_id: userId,
      event_id: eventId
    }

    if (inviterId) conditions.inviter_id = inviterId

    return EventInvitation.where(conditions).fetch(opts)
  }
})
