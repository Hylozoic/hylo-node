var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var checkAndSetMembership = require(root('api/policies/checkAndSetMembership'))

describe('checkAndSetMembership', () => {
  var user, group, req, res

  before(async () => {
    group = await factories.group({ }).save()
    user = await factories.user().save()
  })

  beforeEach(() => {
    req = factories.mock.request()
    req.params.groupId = group.id
    res = factories.mock.response()
  })

  it("doesn't set res.locals.membership if publicAccessAllowed", () => {
    req.user = {email: 'lawrence@nothylo.com'}
    res.locals.publicAccessAllowed = true
    var next = spy(() => {})

    return checkAndSetMembership(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
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
    })
  })

  it('returns false if the user is not logged in', () => {
    req.session.userId = user.id
    return checkAndSetMembership(req, res)
    .then(() => expect(res.forbidden).to.have.been.called())
  })

  it('returns true if the user is in the group', async () => {
    req.session.userId = user.id
    const next = spy()
    await group.addMembers([user.id])
    return checkAndSetMembership(req, res, next)
    .then(() => expect(next).to.have.been.called())
  })
})
