var request = require('request');

module.exports = {
  getUserDetails: function(accessToken){
    return new Promise((resolve, reject) => {
      request({
        url: process.env.HITFIN_API_URL + '/api/users',
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
          resolve(JSON.parse(body));
        }
      })
    });
  }
}
