var request = require('request');

module.exports = {
  getUserDetails: function(accessToken){
    return new Promise((resolve, reject) => {
      request({
        url: process.env.HITFIN_API_URL + '/users',
        headers: {
          'Authorization': accessToken
        }
      }, function(error, response, body){
        if(error){
          reject(error);
        }
        else if(response.statusCode >=400){
          reject(body);
        }
        else{
          resolve(body);
        }
      })
    });
  }
}
