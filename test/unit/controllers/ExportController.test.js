const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const ExportController = require(rootPath('api/controllers/ExportController'))

describe('ExportController', function () {
  var fixtures, req, res

  before(() =>
    setup.clearDb().then(() => Promise.props({
      u1: factories.user().save(),
      u2: factories.user().save(),
      u3: factories.user().save(),
      p1: factories.post().save(),
      p2: factories.post().save(),
      g1: factories.group().save(),
      cm1: factories.comment().save()
    }))
    .then(props => {
      fixtures = props
    })
    .then(() => Promise.join(
      fixtures.p1.groups().attach(fixtures.g1.id),
      fixtures.p1.comments().create(fixtures.cm1),
      fixtures.g1.addMembers([fixtures.u1.id], { role: GroupMembership.Role.MODERATOR }),
      fixtures.g1.addMembers([fixtures.u2.id])
    )))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('#groupData', function () {
    beforeEach(() => {
      // req.params['groupId'] = fixtures.g1.id
      // req.params['datasets'] = ['members']
      req.session = { userId: fixtures.u1.id }
    })

    it('raises an error with no groupId', async function () {
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(400)
    })

    it('raises an error with no datasets specified', async function () {
      req.params['groupId'] = fixtures.g1.id
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(400)
    })

    it('raises an error if user doesnt have permission to moderate the group', async function () {
      req.session = { userId: fixtures.u2.id }
      req.params['groupId'] = fixtures.g1.id
      req.params['datasets'] = ['members']
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(403)
    })

    it("calls export members with correct params", async () => {
      req.params['groupId'] = fixtures.g1.id
      req.params['datasets'] = ['members']
      await ExportController.groupData(req, res)
      expect(res.ok).to.have.been.called.with({})
    })
  })
})
