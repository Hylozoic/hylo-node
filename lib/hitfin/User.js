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
      request({
      url: process.env.HITFIN_API_URL + '/api/stabletoken/balances',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    }, function(error, response, body){
      if(error){
        reject(error);
      }
      else if(response.statusCode >=400){
        reject(JSON.parse(body));
      }
      else{
        console.log(JSON.parse(body))
        resolve(JSON.parse(body));
      }
      })
    })
  }
}
