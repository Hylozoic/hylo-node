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

      console.log("============================================================================")
      console.info("Issue.create")
      console.info(url)
      console.info(data)
      console.info(accessToken)

      request.post({
        url: url,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json; charset=utf-8'
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
          resolve(body.hash)
        }
      })
    })
  },
  getIssueIdFromLog: function(transactionLogEntry){
    return transactionLogEntry.data.issueId
  }
}
