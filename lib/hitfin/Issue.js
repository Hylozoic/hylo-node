var request = require('request');

module.exports = {
  create: function(accessToken, financialContributionAmount, endDate){
    return new Promise((resolve, reject) => {
      const url = process.env.HITFIN_API_URL + '/api/securities/issues'
      const data = {
        "par_value": 1,
        "num_shares": financialContributionAmount * 100,
        "maturity_date": new Date(endDate).toISOString(),
        "type_id": 2
      }

      sails.log.debug("============================================================================")
      sails.log.debug("Issue.create")
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
        if(error){
          sails.log.error(error)
          reject(error)
        }
        else if(response.statusCode >=400){
          sails.log.error(body)
          reject(body)
        }
        else{
          sails.log.debug(body)
          resolve(body.hash)
        }
      })
    })
  },
  getIssueIdFromLog: function(transactionLogEntry){
    return transactionLogEntry.data.issueId
  },
  get: function(accessToken, issueId){
      return new Promise((resolve, reject) => {
        const url = process.env.HITFIN_API_URL + '/api/securities/issues/' + issueId

        sails.log.debug("============================================================================")
        sails.log.debug("Issue.get")
        sails.log.debug(url)

        request({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        }, function(error, response, body) {

            if (error) {
              sails.log.error(error)
              reject(error)
            } else if (response.statusCode >= 400) {
              sails.log.error(body)
              reject(JSON.parse(body))
            } else {
              sails.log.debug(body)
              resolve(JSON.parse(body))
            }
        })
    })
  }
}
