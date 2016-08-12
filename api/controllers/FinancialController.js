const passport = require('passport')
const rollbar = require('rollbar')
const request = require('request')

const getAccessToken = function (req) {
  return UserExternalData.find(req.session.userId, 'hit-fin').then( user_data => {
    if (user_data)
      return user_data.attributes.data.accessToken
    else
      return null
  })
}


module.exports = {
    getBalance: function(req, res, next){
      return getAccessToken(req).then( accessToken => {
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
              reject();
            }
            else{
              resolve(JSON.parse(body));
            }
          })
        })
        }).then( (response) => {
          res.ok({balance: response.latest.amount})
      })
  }
}
