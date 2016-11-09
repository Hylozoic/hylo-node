export function pushToSockets (room, messageType, payload, socketToExclude) {
  // for security reasons, only sockets that passed the checkAndSetPost policy
  // get subscribed to the comment stream for that post
  sails.sockets.broadcast(room, messageType, payload, socketToExclude)
  return Promise.resolve()
}
