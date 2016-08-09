const passport = require('passport')
const rollbar = require('rollbar')
const request = require('request')

const getAccessToken = function (req) {
  return UserExternalData.find(req.session.userId, 'hit-fin').then( user_data => {
    return user_data.attributes.data.accessToken
  })
}

function getUserBalance (req, res, next) {

  return getAccessToken(req).then( accessToken => {
    return new Promise((resolve, reject) => {
      var respond = (error) => {
        if (error && error.stack) rollbar.handleError(error, req)

        return resolve(res.view('popupDone', {
          error,
          context: req.session.authContext || 'oauth',
          layout: null,
          returnDomain: req.session.returnDomain
        }))
      }
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
  })
}

module.exports = {
    getBalance: function(req, res, next){
      return getUserBalance(req, res, next)
  }
}
