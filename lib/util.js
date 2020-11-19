const socketIoEmitter = require("socket.io-emitter");
const redis = require("kue/node_modules/redis");
const redisInfo = require("parse-redis-url")().parse(process.env.REDIS_URL);

module.exports = {
  redisClient: function () {
    return redis.createClient(redisInfo.port, redisInfo.host, {
      auth_pass: redisInfo.password,
    });
  },

  socketIo: function () {
    return socketIoEmitter(this.redisClient());
  },
};
