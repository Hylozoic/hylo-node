var request = require('request')

module.exports = {
  createSellOffer: function(accessToken, issueId, financialContributionAmount, endDate, offereeEmail){
    return new Promise((resolve, reject) => {
      const url = process.env.HITFIN_API_URL + '/api/securities/offers/sell'

      var data = {
        "issue_id": issueId,
        "price": 0.01,
        "num_shares": financialContributionAmount * 100,
        "expiration_date": endDate
      }

      if(offereeEmail){
        data["offeree_email"] = offereeEmail
      }

      console.log("============================================================================")
      console.info("Offer.createSellOffer")
      console.info(url)
      console.info(data)

      request.post({
        url: url,
        headers: {
          'Authorization': 'Bearer ' + accessToken
        },
        json: data
      }, function(error, response, body){
        console.error(error)
        console.info(body)
        if(error){
          reject(error)
        }
        else if(response.statusCode >=400){
          reject(body)
        }
        else{
          console.log(body.tx.hash)
          resolve(body.tx.hash)
        }
      })
    })
  },
  getOfferIdFromLog: function(transactionLogEntry){
    return transactionLogEntry.data.offerId
  }
}
