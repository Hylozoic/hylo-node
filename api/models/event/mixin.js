import { uniq, difference } from 'lodash/fp'
import moment from 'moment-timezone'

export default {
  isEvent () {
    return this.get('type') === Post.Type.EVENT
  },

  eventInvitees: function () {
    return this.belongsToMany(User).through(EventInvitation, 'event_id', 'user_id')
    .withPivot('response')
  },

  eventInvitations: function () {
    return this.isEvent() ? this.hasMany(EventInvitation, 'event_id') : false
  },

  userEventInvitation: function (userId) {
    return this.eventInvitations().query({ where: { user_id: userId } }).fetchOne()
  },

  removeEventInvitees: async function (userIds, opts) {
    return Promise.map(userIds, async userId => {
      const invitation = await EventInvitation.find({ userId, eventId: this.id })
      return invitation.destroy(opts)
    })
  },

  addEventInvitees: async function (userIds, inviterId, opts) {
    return Promise.map(uniq(userIds), async userId => {
      const invitation = await EventInvitation.find({ userId, eventId: this.id })
      if (invitation) return
      return EventInvitation.create({
        userId,
        inviterId,
        eventId: this.id
      }, opts)
    })
  },

  updateEventInvitees: async function (userIds, inviterId, opts) {
    const eventInviteeIds = (await this.eventInvitees().fetch()).pluck('id')
    const toRemove = difference(eventInviteeIds, userIds)
    const toAdd = difference(userIds, eventInviteeIds)

    await this.removeEventInvitees(toRemove, opts)
    return this.addEventInvitees(toAdd, inviterId, opts)
  },

  prettyEventDates: function (startTime, endTime) {
    if (!startTime && !endTime) return null
    const start = moment(startTime)
    const end = moment(endTime)

    const from = start.format('ddd, MMM D [at] h:mmA')

    let to = ''

    if (endTime) {
      if (end.month() !== start.month()) {
        to = end.format(' - ddd, MMM D [at] h:mmA')
      } else if (end.day() !== start.day()) {
        to = end.format(' - ddd D [at] h:mmA')
      } else {
        to = end.format(' - h:mmA')
      }
    }

    return from + to + " UTC"
  },

  createInviteNotifications: async function (userId, inviteeIds) {
    const invitees = inviteeIds.map(inviteeId => ({
      reader_id: inviteeId,
      post_id: this.id,
      actor_id: userId,
      reason: 'eventInvitation'
    }))
    return Activity.saveForReasons(invitees)
  }
}
