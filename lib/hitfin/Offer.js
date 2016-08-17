var request = require('request')

module.exports = {
    createSellOffer: function(accessToken, issueId, financialContributionAmount, endDate, offereeEmail) {
        return new Promise((resolve, reject) => {
            const url = process.env.HITFIN_API_URL + '/api/securities/offers/sell'

            var data = {
                "issue_id": issueId,
                "price": 0.01,
                "num_shares": financialContributionAmount * 100,
                "expiration_date": endDate
            }

            if (offereeEmail) {
                data["offeree_email"] = offereeEmail
            }

            sails.log.debug("============================================================================")
            sails.log.debug("Offer.createSellOffer")
            sails.log.debug(url)
            sails.log.debug(data)

            request.post({
                url: url,
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                json: data
            }, function(error, response, body) {
                sails.log.error(error)
                sails.log.debug(body)
                if (error) {
                    reject(error)
                } else if (response.statusCode >= 400) {
                    reject(body)
                } else {
                    sails.log.debug(body.tx.hash)
                    resolve(body.tx.hash)
                }
            })
        })
    },
    getOfferIdFromLog: function(transactionLogEntry) {
        return transactionLogEntry.data.offerId
    },
    acceptPartially: function(accessToken, offerId, contributedAmount) {
        return new Promise((resolve, reject) => {
            const url = process.env.HITFIN_API_URL + '/api/securities/offers/accept/partial/' + offerId + '/' + (contributedAmount * 100)

            sails.log.debug("============================================================================")
            sails.log.debug("Offer.acceptPartially")
            sails.log.debug(url)

            request({
                url: url,
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            }, function(error, response, body) {
                sails.log.error(error)
                sails.log.debug(body)
                if (error) {
                    reject(error)
                } else if (response.statusCode >= 400) {
                    reject(JSON.parse(body))
                } else {
                    resolve(JSON.parse(body).tx.hash)
                }
            })
        })
    }
}
