const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
require(rootPath('api/controllers/PaymentController'))
import mock from 'mock-require'


describe('PaymentController', () => {
  var req, res, registerStripeAccount, PaymentController
  const userId = 1234
  const code = 'abcd'

  before(() => {
    registerStripeAccount = spy(() => new Promise((resolve) => { resolve() }))
    mock('../../../api/graphql/mutations/user', {
      registerStripeAccount
    })

    PaymentController = mock.reRequire('../../../api/controllers/PaymentController')
    req = factories.mock.request()
    req.session = {userId}
    req.params.code = code
    res = factories.mock.response()
  })

  describe('#registerStripe', () => {    
    it('calls registerStripeAccount and redirects', () => {
      return PaymentController.registerStripe(req, res)
      .then(() => {
        expect(registerStripeAccount).to.have.been.called.with(userId, code)
        expect(res.redirect).to.have.been.called.with(Frontend.Route.evo.paymentSettings({registered: 'success'}))  
      })
    })
  })
})