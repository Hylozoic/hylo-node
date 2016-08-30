const passport = require('passport')
const rollbar = require('rollbar')
const request = require('request')
import User from '../../lib/hitfin/User'

const getAccessToken = function (req) {
  return UserExternalData.find(req.session.userId, 'hit-fin').then( user_data => {
    if(user_data)
      return user_data.attributes.data.accessToken
    else
      throw new Error("User is not connected to HitFin")
  })
}

function getUserBalance (req, res, next) {

  return getAccessToken(req).then( accessToken => {
      return User.getWalletBalance(accessToken)
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
      })
      .catch(function (err) {
        if (err.message.includes(['not connected to HitFin'], err.message)) {
          res.statusCode = 404
          res.send(req.__(err.message))
        } else {
          res.serverError(err)
        }
      })
      .then( (response) => {
          if(response)
            res.ok({balance: response.latest.amount})
      })
  }
}
