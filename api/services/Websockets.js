module.exports = function (room, messageType, payload, socketToExclude) {
  if (!sails.io) return
  Object.keys(sails.io.sockets.sockets).forEach(function (id) {
    var socket = sails.io.sockets.sockets[id]
    // for security reasons, only sockets that passed the checkAndSetPost policy
    // get subscribed to the comment stream for that post
    if (socket !== socketToExclude && socket.rooms[room]) {
      socket.emit(messageType, payload)
    }
  })
}
