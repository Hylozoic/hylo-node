import factories from '../../../test/setup/factories'
import { updateCommunity } from './community'

describe('updateCommunity', () => {
  var user, community

  before(function () {
    user = factories.user()
    community = factories.community()
    return Promise.join(community.save(), user.save())
    .then(() => user.joinCommunity(community, GroupMembership.Role.MODERATOR))
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
