var request = require('request')

module.exports = {
  create: function(accessToken, issueId, offerId){
    return new Promise((resolve, reject) => {
      const url = process.env.HITFIN_API_URL + '/api/securities/syndicate'
      const data = {
        "issue_id": issueId,
        "offer_id": offerId,
        "deal_carry_basis_points": 0,
        "expense_basis_points": 0,
        "fee_basis_points": 0
      }

      sails.log.debug("============================================================================")
      sails.log.debug("Syndicate.create")
      sails.log.debug(url)
      sails.log.debug(data)

      request.post({
        url: url,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json; charset=utf-8'
        },
        json: data
      }, function(error, response, body){
        sails.log.error(error)
        sails.log.debug(body)

        if(error){
          reject(error)
        }
        else if(response.statusCode >=400){
          reject(body)
        }
        else{
          resolve(body.tx.hash)
        }
      })
    })
  }
}
