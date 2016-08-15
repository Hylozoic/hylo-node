var request = require('request')

module.exports = {
  getLogByTransactionHash: function(accessToken, hash, index){
    const hashWithoutPrefix = hash.substring(2)
    if(index === undefined){
      index = 0
    }
    const url = process.env.HITFIN_API_URL + '/api/logs/tx_hash/' + hashWithoutPrefix + '/' + index
    sails.log.debug("============================================================================")
    sails.log.debug("TransactionLog.getLogByTransactionHash")
    sails.log.debug(url)

    var sendTransactionRequest = function(url, accessToken, hashWithoutPrefix, index, retryCount, resolve, reject){
        const maxRetry = 20
        const retryInterval = 3000

        request({
          url: url,
          headers: {
            'Authorization': 'Bearer ' + accessToken
          }
        }, function(error, response, body){
          sails.log.error(error)
          sails.log.debug(body)
          if(error){
            reject(error)
          }
          else if(response.statusCode >=400){
            if(retryCount < maxRetry){
              retryCount ++
              sails.log.debug('Error: (', response.statusCode, ') - Retrying ', retryCount, ' of ', maxRetry)
              setTimeout(function(){
                sendTransactionRequest(url, accessToken, hashWithoutPrefix, index, retryCount, resolve, reject)
              }, retryInterval)
            }
            else{
              reject(JSON.parse(body))
            }
          }
          else{
            resolve(JSON.parse(body))
          }
        })
    }

    return new Promise((resolve, reject) => {
      sendTransactionRequest(url, accessToken, hashWithoutPrefix, index, 0, resolve, reject)
    })
  }
}
