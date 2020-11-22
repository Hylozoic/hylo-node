import redis from 'redis'
var socketIoEmitter = require('socket.io-emitter')

module.exports = {

  redisClient: function() {
    return redis.createClient(process.env.REDIS_URL)
  },

  socketIo: function() {
    return socketIoEmitter(this.redisClient())
  }

};