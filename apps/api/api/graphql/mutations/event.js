const { GraphQLYogaError } = require('@graphql-yoga/node')

import { values, includes } from 'lodash/fp'

export async function respondToEvent(userId, eventId, response) {

  if (!includes(response, values(EventInvitation.RESPONSE))) {
    throw new GraphQLYogaError(`response must be one of ${values(EventInvitation.RESPONSE)}. received ${response}`)
  }

  const event = await Post.find(eventId)
  if(!event) {
    throw new GraphQLYogaError('Event not found')
  }

  var eventInvitation = await EventInvitation.find({userId, eventId})
  if (eventInvitation) {
    await eventInvitation.save({response})
  } else {
    await EventInvitation.create({
      userId,
      inviterId: userId,
      eventId,
      response
    })
  }
  return {success: true}
}

export async function invitePeopleToEvent (userId, eventId, inviteeIds) {
  inviteeIds.forEach(async inviteeId => {
    var eventInvitation = await EventInvitation.find({userId: inviteeId, eventId})
    if (!eventInvitation) {

      await EventInvitation.create({
        userId: inviteeId,
        inviterId: userId,
        eventId
      })
  
    }
  })
  
  const event = await Post.find(eventId)  

  await event.createInviteNotifications(userId, inviteeIds)

  return event
}
