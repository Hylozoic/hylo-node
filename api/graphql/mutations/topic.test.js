import * as mutations from './topic'
import setup from '../../../test/setup'
import factories from '../../../test/setup/factories'

describe('topic mutations', () => {
  let c1, c2, u1, u2

  before(async () => {
    c1 = await factories.community().save()
    c2 = await factories.community().save()
    u1 = await factories.user().save()
    u2 = await factories.user().save()
    await u1.joinCommunity(c1)
  })

  after(async () => setup.clearDb())

  describe('topicMutationPermissionCheck', () => {
    it('rejects when community does not exist', async () => {
      const check = mutations.topicMutationPermissionCheck(u1.id, 9999)
      await expect(check).to.be.rejectedWith(/community does not exist/)
    })

    it('rejects when not a member of the community', async () => {
      const check = mutations.topicMutationPermissionCheck(u1.id, c2.id)
      await expect(check).to.be.rejectedWith(/not a member/)
    })

    it('does not reject when user is a member', async () => {
      const check = mutations.topicMutationPermissionCheck(u1.id, c1.id)
      await expect(check).not.to.be.rejected
    })
  })

  describe('createTopic', () => {
    // validation is mostly tested in hylo-utils, so this just left here to show willing...
    it('rejects on invalid topic names', async () => {
      const actual = mutations.createTopic(
        u1.id,
        '0123456789 0123456789 0123456789 0123456789 0123456789',
        c1.id
      )
      await expect(actual).to.be.rejectedWith(/must not contain whitespace/)
    })

    it('adds the topic to the community', async () => {
      const topic = await mutations.createTopic(u1.id, 'wombats', c1.id)
      await topic.refresh({ withRelated: [ 'communities' ] })
      const community = topic.communities().first()
      expect(community.id).to.equal(c1.id)
    })
  })

  describe.only('subscribe', async () => {
    let t

    beforeEach(async () => {
      t = await factories.tag().save()
      await Tag.addToCommunity({
        community_id: c1.id,
        tag_id: t.id,
        user_id: u2.id
      })
    })

    it('adds the user to the topic', async () => {
      await mutations.subscribe(u1.id, t.id, c1.id, true)
      await u1.refresh({ withRelated: [ 'followedTags' ] })
      const tag = u1.relations.followedTags.first()
      expect(tag.id).to.equal(t.id)
    })

    it('removes the user from the topic if isSubscribing falsy', async () => {
      await new TagFollow({
        community_id: c1.id,
        tag_id: t.id,
        user_id: u1.id
      }).save()
      await mutations.subscribe(u1.id, t.id, c1.id, false)
      await u1.refresh({ withRelated: [ 'followedTags' ] })
      const hasFollow = u1.relations.followedTags.find({ id: t.id })
      expect(hasFollow).to.equal(undefined)
    })
  })
})
