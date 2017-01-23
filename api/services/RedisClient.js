import redis from 'redis'
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

module.exports = {
  create: function () {
    return redis.createClient(process.env.REDIS_URL)
  }
}
