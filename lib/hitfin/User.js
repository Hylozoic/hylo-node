var request = require('request');

module.exports = {
  get: function(accessToken){
    const url = process.env.HITFIN_API_URL + '/api/users'

    sails.log.debug("============================================================================")
    sails.log.debug("User.get")
    sails.log.debug(url)

    return new Promise((resolve, reject) => {
      request({
        url: url,
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
      }, function(error, response, body){
        if(error){
          sails.log.error(error)
          reject(error);
        }
        else if(response.statusCode >=400){
          sails.log.error(body)
          reject(JSON.parse(body));
        }
        else {
          sails.log.debug(body)
          resolve(JSON.parse(body));
        }
      })
    })
  },

  getWalletBalance: function(accessToken) {
    return new Promise((resolve, reject) => {
      const url = process.env.HITFIN_API_URL + '/api/stabletoken/balances'

      sails.log.debug("============================================================================")
      sails.log.debug("User.getWalletBalance")
      sails.log.debug(url)

      request({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    }, function(error, response, body){
      if(error){
        sails.log.error(error)
        reject(error);
      }
      else if(response.statusCode >=400){
        sails.log.error(JSON.parse(body))
        reject(JSON.parse(body));
      }
      else{
        sails.log.debug(JSON.parse(body))
        resolve(JSON.parse(body));
      }
      })
    })
  }
}
