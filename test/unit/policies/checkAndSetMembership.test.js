var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var checkAndSetMembership = require(root('api/policies/checkAndSetMembership'))

describe('checkAndSetMembership', () => {
  var community, req, res

  before(() => {
    community = factories.community()
    let network = factories.network()
    return network.save()
    .then(() => community.save({network_id: network.id}))
  })

  beforeEach(() => {
    req = factories.mock.request()
    req.params.communityId = community.id

    res = factories.mock.response()
  })

  it('sets res.locals.membership for admins', () => {
    req.user = {email: 'lawrence@hylo.com'}
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.exist
      expect(typeof res.locals.membership.save).to.equal('function')
    })
  })

  it("doesn't set res.locals.membership if publicAccessAllowed", () => {
    req.user = {email: 'lawrence@nothylo.com'}
    res.locals.publicAccessAllowed = true
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.not.exist
    })
  })

  it('allows public access for logged in users', () => {
    req.user = {email: 'lawrence@nothylo.com'}
    req.session.userId = 1
    res.locals.publicAccessAllowed = true
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      expect(res.locals.membership).to.not.exist
    })
  })

  it('returns false if the user is not logged in', () => {
    return checkAndSetMembership(req, res)
    .then(() => expect(res.forbidden).to.have.been.called())
  })
})
