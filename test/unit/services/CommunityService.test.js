var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var CommunityService = require(root('api/services/CommunityService'))

describe('CommunityService', function () {
  let fixtures;

  before(() => {
    return setup.clearDb()
      .then(() => Promise.props({
        u1: factories.user({name: 'moderator'}).save(),
        u2: factories.user().save({name: 'user' }),
        c1: factories.community({num_members: 0}).save()
      }))
      .then(props => fixtures = props)
      .then(() => Membership.create(fixtures.u1.id, fixtures.c1.id, {role: Membership.MODERATOR_ROLE}))
      .then(() => Membership.create(fixtures.u2.id, fixtures.c1.id))
  })

  it('removes a member from a community', () => {
    return Membership.inAllCommunities(fixtures.u2.id, [fixtures.c1.id])
      .then(result => {
        expect(result).to.equal(true)
        return CommunityService.removeMember(fixtures.u2.id, fixtures.c1.id, fixtures.u1.id)
      })
      .then(() => Promise.props({
        inCommunity: Membership.inAllCommunities(fixtures.u2.id, [fixtures.c1.id]),
        refreshedCommunity: fixtures.c1.refresh()
      }))
      .then(props => {
        expect(props.inCommunity).to.equal(false)
        expect(props.refreshedCommunity.get('num_members')).to.equal(1)
      })
  })
})
