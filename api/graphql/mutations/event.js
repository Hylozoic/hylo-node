import { values, includes } from 'lodash/fp'

export async function respondToEvent(userId, eventId, response) {

  if (!includes(response, values(EventInvitation.response))) {
    throw new Error('response must be one of', values(EventInvitation.response), '. received', response)
  }

  const event = await Post.find(eventId)
  if(!event) {
    throw new Error('Event not found')
  }

  var eventInvitation = await EventInvitation.find({userId, eventId})
  if (eventInvitation) {
    return eventInvitation.update({response})
  } else {
    return EventInvitation.create({
      userId,
      inviterId: userId,
      eventId,
      response
    })
  }
}