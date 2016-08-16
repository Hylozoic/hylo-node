const redis = require("redis")
const bluebird = require('bluebird')
const HitfinAuthenticate = require('../../lib/hitfin/Authenticate')
const HitfinUser = require('../../lib/hitfin/User')
const NAME_HITFIN_ACCESS_TOKEN = 'hitfin_syndicate_manager_access_token'

const getSyndicateManagerAccessTokenFromHitfin = function(){
  return HitfinAuthenticate.getAccessToken(process.env.HITFIN_CLIENT_ID, process.env.HITFIN_CLIENT_SECRET).
    then((token) => {
      client.set(NAME_HITFIN_ACCESS_TOKEN, token)
      return token
    })
}

module.exports = {
  getHitfinManagerAccessToken: function() {
    const client = redis.createClient()
    bluebird.promisifyAll(redis.RedisClient.prototype)
    bluebird.promisifyAll(redis.Multi.prototype)
    //get the access token from redis. if not exists then get from hitfin and save it inside redis
    return client.getAsync(NAME_HITFIN_ACCESS_TOKEN).then(function(res) {
      if(res){
        return HitfinUser.get(res).then(() => {
          return res // If the user details is retrieved successfully, it means the token is valid
        },
        getSyndicateManagerAccessTokenFromHitfin)
      }
      else{
        return getSyndicateManagerAccessTokenFromHitfin()
      }
    })
  }
}
