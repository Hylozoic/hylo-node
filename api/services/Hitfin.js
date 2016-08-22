const redis = require('redis')
const bluebird = require('bluebird')
const HitfinAuthenticate = require('../../lib/hitfin/Authenticate')
const HitfinUser = require('../../lib/hitfin/User')
const NAME_HITFIN_ACCESS_TOKEN = 'hitfin_syndicate_manager_access_token'
const EXPIRED_HITFIN_ACCESS_TOKEN = 'hitfin_syndicate_manager_access_token_expired'

const getSyndicateManagerAccessTokenFromHitfin = function(client){
  return HitfinAuthenticate.getAccessToken(process.env.HITFIN_CLIENT_ID, process.env.HITFIN_CLIENT_SECRET).
    then((token) => {
      client.set(NAME_HITFIN_ACCESS_TOKEN, token)
      var expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() + 1);
      client.set(EXPIRED_HITFIN_ACCESS_TOKEN, expiredDate.toISOString())
      return token
    })
}

module.exports = {
  getHitfinManagerAccessToken: function() {
    const client = redis.createClient()
    bluebird.promisifyAll(redis.RedisClient.prototype)
    bluebird.promisifyAll(redis.Multi.prototype)
    //get the access token from redis. if not exists then get from hitfin and save it inside redis
    return client.getAsync(NAME_HITFIN_ACCESS_TOKEN).then(function(token) {
      if(token){
        return client.getAsync(EXPIRED_HITFIN_ACCESS_TOKEN).then(function(expiredDate) {
          if(expiredDate && new Date(expiredDate) >= new Date() )
          {
            return token
          }
          else
          {
            return getSyndicateManagerAccessTokenFromHitfin(client)
          }
        })
      }
      else{
        return getSyndicateManagerAccessTokenFromHitfin(client)
      }
    })
  }
}
