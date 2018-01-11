import factories from '../../../test/setup/factories'
import { updateCommunity, createCommunity } from './community'

describe('updateCommunity', () => {
  var user, community

  before(function () {
    user = factories.user()
    community = factories.community()
    return Promise.join(community.save(), user.save())
    .then(() => user.joinCommunity(community, Membership.MODERATOR_ROLE))
  })

  it('rejects if name is blank', () => {
    const data = {name: '   '}
    return updateCommunity(user.id, community.id, data)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/Name cannot be blank/))
  })

  it('rejects if user is not a moderator', () => {
    const data = {name: '   '}
    return updateCommunity('777', community.id, data)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/don't have permission/))
  })
})

describe('createCommunity', () => {
  var user, network

  before(function () {
    user = factories.user()
    network = factories.network()
    const starterCommunity = factories.community({slug: 'starter-posts'})
    return Promise.join(network.save(), user.save(), starterCommunity.save())
    .then(() => NetworkMembership.addModerator(user.id, network.id))
  })

  it("rejects if can't moderate network", () => {
    const data = {name: 'goose', slug: 'goose', networkId: network.id + 1}
    return createCommunity(user.id, data)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/don't have permission/))
  })

  it('creates community in network if user can moderate', () => {
    const data = {name: 'goose', slug: 'goose', networkId: network.id}
    return createCommunity(user.id, data)
    .then(membership => Community.find(membership.get('community_id')))
    .then(community => {
      expect(community).to.exist
      expect(Number(community.get('network_id'))).to.equal(network.id)
    })
  })
})
