const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const GroupService = require(root('api/services/GroupService'))

describe('GroupService', function () {
  let u1, u2, g1

  before(async () => {
    await setup.clearDb()
    await bookshelf.transaction(async (transacting) => {
      u1 = await factories.user({ name: 'moderator' }).save({}, { transacting })
      u2 = await factories.user().save({ name: 'user' }, { transacting })
      g1 = await factories.group({ num_members: 0 }).save({}, { transacting })
      await u1.joinGroup(g1, { role: GroupMembership.Role.MODERATOR, transacting })
      await u2.joinGroup(g1, { transacting })
    })
  })

  it('removes a member from a group', () => {
    return Group.allHaveMember([g1.id], u2.id, Group)
      .then(result => {
        expect(result).to.equal(true)
        return GroupService.removeMember(u2.id, g1.id, u1.id)
      })
      .then(() => Promise.props({
        inGroup: Group.allHaveMember([g1.id], u2.id, Group),
        refreshedGroup: g1.refresh()
      }))
      .then(props => {
        expect(props.inGroup).to.equal(false)
        expect(props.refreshedGroup.get('num_members')).to.equal(1)
      })
  })
})
