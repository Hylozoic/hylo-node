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
        console.log(accessToken)
        return new Promise((resolve, reject) => {
          request({
            url: process.env.HITFIN_API_URL + '/api/stabletoken/balances',
            headers: {
              'Authorization': 'Bearer ' + accessToken
            }
          }, function(error, response, body){
            console.log(body)
            if(error){
              reject(error);
            }
            else if(response.statusCode >=400){
              reject();
            }
            else{
              console.log(JSON.parse(body))
              resolve(JSON.parse(body));
            }
          })
        })
        }).then( (response) => {
          console.log(response.latest.amount)
          res.ok({balance: response.latest.amount})
      })
  }
}
