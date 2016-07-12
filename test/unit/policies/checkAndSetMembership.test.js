var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var checkAndSetMembership = require(root('api/policies/checkAndSetMembership'))

describe('checkAndSetMembership', () => {
  var community

  before(() => {
    community = factories.community()
    let network = factories.network()
    return network.save()
    .then(() => community.save({network_id: network.id}))
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

  it("doesn't set res.locals.membership if publicAccessAllowed", () => {
    var req = factories.mock.request()
    req.params.communityId = community.id
    req.user = {email: 'lawrence@nothylo.com'}
    var res = factories.mock.response()
    res.locals.publicAccessAllowed = true
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.not.exist
    })
  })

  it('allows public access for logged in users', () => {
    var req = factories.mock.request()
    req.params.communityId = community.id
    req.user = {email: 'lawrence@nothylo.com'}
    req.session.userId = 1
    var res = factories.mock.response()
    res.locals.publicAccessAllowed = true
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.not.exist
    })
  })
})
