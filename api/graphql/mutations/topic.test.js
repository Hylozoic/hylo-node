import * as mutations from './topic'
import setup from '../../../test/setup'
import factories from '../../../test/setup/factories'

describe.only('topic mutations', () => {
  let u, c1, c2

  before(async () => {
    c1 = await factories.community().save()
    c2 = await factories.community().save()
    u = await factories.user().save()
    await u.joinCommunity(c1)
  })

  after(async () => setup.clearDb())

  describe('topicMutationPermissionCheck', () => {
    it('rejects when community does not exist', async () => {
      const check = mutations.topicMutationPermissionCheck(u.id, 9999)
      await expect(check).to.be.rejectedWith(/community does not exist/)
    })

    it('rejects when not a member of the community', async () => {
      const check = mutations.topicMutationPermissionCheck(u.id, c2.id)
      await expect(check).to.be.rejectedWith(/not a member/)
    })

    it('does not reject when user is a member', async () => {
      const check = mutations.topicMutationPermissionCheck(u.id, c1.id)
      await expect(check).not.to.be.rejected
    })
  })

  describe('createTopic', () => {
    // validation is mostly tested in hylo-utils, so this just left here to show willing...
    it('rejects on invalid topic names', async () => {
      const actual = mutations.createTopic(
        u.id,
        '0123456789 0123456789 0123456789 0123456789 0123456789',
        c1.id
      )
      await expect(actual).to.be.rejectedWith(/must not contain whitespace/)
    })

    it('adds the topic to the community', async () => {
      const topic = await mutations.createTopic(u.id, 'wombats', c1.id)
      await topic.refresh({ withRelated: [ 'communities' ] })
      const community = topic.relations.communities.first()
      expect(community.id).to.equal(c1.id)
    })
  })
})
