var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var CommunityService = require(root('api/services/CommunityService'))

describe('CommunityService', function () {
  let u1, u2, c1

  before(async () => {
    await setup.clearDb()
    u1 = await factories.user({name: 'moderator'}).save()
    u2 = await factories.user().save({name: 'user'})
    c1 = await factories.community({num_members: 0}).save()
    await u1.joinCommunity(c1, GroupMembership.Role.MODERATOR)
    await u2.joinCommunity(c1)
  })

  it('removes a member from a community', () => {
    return Group.allHaveMember([c1.id], u2.id, Community)
    .then(result => {
      expect(result).to.equal(true)
      return CommunityService.removeMember(u2.id, c1.id, u1.id)
    })
    .then(() => Promise.props({
      inCommunity: Group.allHaveMember([c1.id], u2.id, Community),
      refreshedCommunity: c1.refresh()
    }))
    .then(props => {
      expect(props.inCommunity).to.equal(false)
      expect(props.refreshedCommunity.get('num_members')).to.equal(1)
    })
  })
})
