var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var checkAndSetMembership = require(root('api/policies/checkAndSetMembership'))

describe('checkAndSetMembership', () => {
  var community

  before(() => {
    community = factories.community()
    return community.save()
  })

  it('sets res.locals.membership for admins', () => {
    var req = factories.mock.request()
    req.params.communityId = community.id
    req.user = {email: 'lawrence@hylo.com'}
    var res = factories.mock.response()
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.exist
      expect(typeof res.locals.membership.save).to.equal('function')
    })
  })
})
