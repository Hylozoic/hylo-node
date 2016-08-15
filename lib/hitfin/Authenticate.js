var request = require('request')

module.exports = {
  getAccessToken: function(clientId, clientSecret){

    return new Promise((resolve, reject) => {
      const url = process.env.HITFIN_API_URL + '/oauth/token?client_id=' + clientId +'&client_secret=' + clientSecret + '&grant_type=client_credentials'
      sails.log.debug("============================================================================")
      sails.log.debug("Authenticate.getAccessToken")
      sails.log.debug(url)

      request.post({
        url: url
      }, function(error, response, body){
        sails.log.error(error)
        sails.log.debug(body)
        if(error){
          reject(error);
        }
        else if(response.statusCode >=400){
          reject(JSON.parse(body));
        }
        else{
          resolve(JSON.parse(body).access_token);
        }
      })
    })
  }
}
