const passport = require('passport')
const rollbar = require('rollbar')
const request = require('request')
import HitfinUser from '../../lib/hitfin/User'

module.exports = {
    getBalance: function(req, res, next){
      return User.getAccessToken(req.session.userId).then( accessToken => {
        return HitfinUser.getWalletBalance(accessToken)
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
