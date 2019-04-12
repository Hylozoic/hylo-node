import { registerStripeAccount } from '../graphql/mutations/user'

module.exports = {
  registerStripe: function (req, res) {
    const code = req.param('code')
    if (!code) {
      throw new Error('registerStripe requires a code param')
    }
    return registerStripeAccount(req.session.userId, code)
    .then(() => res.redirect(Frontend.Route.evo.paymentSettings({registered: 'success'})))
    .catch(() => res.redirect(Frontend.Route.evo.paymentSettings({registered: 'error'})))
  }
}
