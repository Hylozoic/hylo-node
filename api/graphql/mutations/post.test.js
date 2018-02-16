import '../../../test/setup'
import factories from '../../../test/setup/factories'
import { pinPost } from './post'

describe('pinPost', () => {
  var user, community, post

  before(function () {
    user = factories.user()
    community = factories.community()
    post = factories.post()
    return Promise.join(community.save(), user.save(), post.save())
    .then(() => community.posts().attach(post))
    .then(() => user.joinCommunity(community, GroupMembership.Role.MODERATOR))
  })

  it('sets pinned_at to current time if not set', () => {
    return pinPost(user.id, post.id, community.id)
    .then(() => PostMembership.find(post.id, community.id))
    .then(postMembership => {
      expect(postMembership.get('pinned_at').getTime())
      .to.be.closeTo(new Date().getTime(), 2000)
    })
  })

  it('sets pinned_at to null if set', () => {
    return pinPost(user.id, post.id, community.id)
    .then(() => PostMembership.find(post.id, community.id))
    .then(postMembership => {
      expect(postMembership.get('pinned_at')).to.equal(null)
    })
  })

  it('rejects if user is not a moderator', () => {
    return pinPost('777', post.id, community.id)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/don't have permission/))
  })

  it("rejects if postMembership doesn't exist", () => {
    return pinPost(user.id, '919191', community.id)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/Couldn't find postMembership/))
  })
})
