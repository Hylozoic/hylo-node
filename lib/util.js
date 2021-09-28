/* globals RedisClient */
var socketIoEmitter = require('socket.io-emitter')

module.exports = {

  socketIo: function() {
    return socketIoEmitter(RedisClient.create())
  }

};
