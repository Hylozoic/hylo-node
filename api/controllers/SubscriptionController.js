var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = {
  create: function (req, res) {
    var params = req.allParams()

    return stripe.customers.create({
      email: params.token.email,
      source: params.token.id,
      plan: params.planId
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  }
}
