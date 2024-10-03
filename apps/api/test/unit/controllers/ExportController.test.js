const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const ExportController = require(rootPath('api/controllers/ExportController'))

describe('ExportController', function () {
  let req, res, u1, u2, u3, p1, p2, g1, cm1

  before(async () =>
    bookshelf.transaction(async (transacting) => {
      await setup.clearDb()
      u1 = await factories.user().save({}, { transacting })
      u2 = await factories.user().save({}, { transacting })
      u3 = await factories.user().save({}, { transacting })
      p1 = await factories.post().save({}, { transacting })
      p2 = await factories.post().save({}, { transacting })
      g1 = await factories.group().save({}, { transacting })
      cm1 = await factories.comment().save({}, { transacting })
      await p1.comments().create(cm1, { transacting })
      await p1.groups().attach(g1.id, { transacting })
      await g1.addMembers([u1.id], { role: GroupMembership.Role.MODERATOR }, { transacting })
      await g1.addMembers([u2.id], {}, { transacting })
    })
  )

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('#groupData', function () {
    beforeEach(() => {
      // req.params['groupId'] = fixtures.g1.id
      // req.params['datasets'] = ['members']
      req.session = { userId: u1.id }
    })

    it('raises an error with no groupId', async function () {
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(400)
    })

    it('raises an error with no datasets specified', async function () {
      req.params.groupId = g1.id
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(400)
    })

    it('raises an error if user doesnt have permission to moderate the group', async function () {
      req.session = { userId: u2.id }
      req.params.groupId = g1.id
      req.params.datasets = ['members']
      await ExportController.groupData(req, res)
      expect(res.status).to.have.been.called.with(403)
    })

    it('calls export members with correct params', async () => {
      req.params.groupId = g1.id
      req.params.datasets = ['members']
      await ExportController.groupData(req, res)
      expect(res.ok).to.have.been.called.with({})
    })
  })
})
