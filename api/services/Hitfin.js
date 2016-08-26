const redis = require('redis')
const bluebird = require('bluebird')
const HitfinAuthenticate = require('../../lib/hitfin/Authenticate')
const HitfinUser = require('../../lib/hitfin/User')
const NAME_HITFIN_ACCESS_TOKEN = 'hitfin_syndicate_manager_access_token'

const getSyndicateManagerAccessTokenFromHitfin = function(client){
  return HitfinAuthenticate.getAccessToken(process.env.HITFIN_CLIENT_ID, process.env.HITFIN_CLIENT_SECRET).
    then((token) => {
      client.set(NAME_HITFIN_ACCESS_TOKEN, token)
      client.expire(NAME_HITFIN_ACCESS_TOKEN, 60 * 60 * 23)
      client.quit()
      return token
    })
}

module.exports = {
  getHitfinManagerAccessToken: function() {
    var client
    try{
      const url = process.env.REDIS_URL || 'redis://localhost:6379'
      const redisInfo = require('parse-redis-url')(redis).parse(url)
      redisInfo.auth = redisInfo.password
      redisInfo.db = redisInfo.database
      redisInfo.no_ready_check = true
      client = redis.createClient(redisInfo)
      bluebird.promisifyAll(redis.RedisClient.prototype)
      bluebird.promisifyAll(redis.Multi.prototype)
    }catch(err){
      console.error(err)
      return null
    }
    //get the access token from redis. if not exists then get from hitfin and save it inside redis
    return client.getAsync(NAME_HITFIN_ACCESS_TOKEN).then(function(token) {
      if(token){
        client.quit()
        return token
      }
      else{
        return getSyndicateManagerAccessTokenFromHitfin(client)
      }
    }, (err) => {
      console.error(err)
      return null
    })
  }
}
