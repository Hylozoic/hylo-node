export function pushToSockets (room, messageType, payload, socketToExclude) {
  if (process.env.NODE_ENV === 'test') return Promise.resolve()
  // for security reasons, only sockets that passed the checkAndSetPost policy
  // get subscribed to the comment stream for that post
  sails.sockets.broadcast(room, messageType, payload, socketToExclude)
  return Promise.resolve()
}
