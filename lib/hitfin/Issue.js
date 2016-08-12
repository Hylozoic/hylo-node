var request = require('request');

module.exports = {
  createIssue: function(accessToken, financial_contribution_amount, end_date){
    return new Promise((resolve, reject) => {
      const formData = {
        "par_value": 0.01,
        "num_shares": financial_contribution_amount * 100,
        "maturity_date": end_date,
        "coupon_frequency_secs": 3600,
        "yield_basis_points": 1200,
        "is_callable": true,
        "type_id": 2
      }
      request.post({
        url: process.env.HITFIN_API_URL + '/api/securities/issues',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        },
        formData: formData
      }, function(error, response, body){
        if(error){
          reject(error);
        }
        else if(response.statusCode >=400){
          reject(JSON.parse(body));
        }
        else{
          resolve(JSON.parse(body));
        }
      })
    });
  }
}
