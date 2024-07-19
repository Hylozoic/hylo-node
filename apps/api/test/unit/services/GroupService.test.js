var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var GroupService = require(root('api/services/GroupService'))

describe('GroupService', function () {
  let u1, u2, g1

  before(async () => {
    await setup.clearDb()
    u1 = await factories.user({name: 'moderator'}).save()
    u2 = await factories.user().save({name: 'user'})
    g1 = await factories.group({num_members: 0}).save()
    await u1.joinGroup(g1, { role: GroupMembership.Role.MODERATOR })
    await u2.joinGroup(g1)
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
