export function pushToSockets (room, messageType, payload, socketToExclude) {
  if (!sails.io) return
  return Promise.map(Object.keys(sails.io.sockets.sockets), id => {
    const socket = sails.io.sockets.sockets[id]
    // for security reasons, only sockets that passed the checkAndSetPost policy
    // get subscribed to the comment stream for that post
    if (socket !== socketToExclude && socket.rooms[room]) {
      console.log('emitting message: ', messageType, room)
      socket.emit(messageType, payload)
      return Promise.resolve()
    }
  })
}
