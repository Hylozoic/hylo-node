const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const PaymentController = require(rootPath('api/controllers/PaymentController'))
import mockRequire from 'mock-require'


describe.skip('PaymentController', () => {
  var req, res, registerStripeAccount
  const userId = 1234
  const code = 'abcd'

  before(() => {
    registerStripeAccount = spy()
    mockRequire('../../../api/graphql/mutations/user', {
      registerStripeAccount
    })
    req = factories.mock.request()
    req.session = {userId}
    req.params.code = code
    res = factories.mock.response()
    mockRequire.reRequire('../../../api/graphql/mutations/user')
  })

  describe('#registerStripe', () => {
    it('calls registerStripeAccount and redirects', () => {
      return PaymentController.registerStripe(req, res)
      .then(() => {
        expect(registerStripeAccount).to.have.been.called.with(userId, code)
        expect(res.redirect.to.have.been.called.with(Frontend.Route.evo.paymentSettings({registered: 'success'})))  
      })
    })
  })
})