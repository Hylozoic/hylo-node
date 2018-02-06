const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('GroupMembership', () => {
  describe.only('forPair', () => {
    let c, u

    beforeEach(async () => {
      c = await factories.community().save()
      u = await factories.user().save()
    })

    it('should throw if no user', () => {
      expect(() => GroupMembership.forPair()).to.throw(/user or user id/)
    })

    it('should throw if no instance', () => {
      expect(() => GroupMembership.forPair(u)).to.throw(/without an instance/)
    })

    it('should invoke forIds with the correct ids and model', () => {
      const forIds = GroupMembership.forPair
      GroupMembership.forIds = spy(() => {})
      GroupMembership.forPair(u, c)
      expect(GroupMembership.forIds).to.have.been.called.with(u.id, c.id, c.constructor)
      GroupMembership.forIds = forIds
    })
  })

  describe('hasActiveMembership', () => {
    let u, c1, c2, gm

    beforeEach(async () => {
      u = await factories.user().save()
      c1 = await factories.community().save()
      c2 = await factories.community().save()
      gm = await u.joinCommunity(c1)
    })

    it('returns false if user is not a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, c2)
      expect(actual).to.equal(false)
    })

    it('returns true if user is a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, c1)
      expect(actual).to.equal(true)
    })

    it('returns false if user is an inactive member', async () => {
      await gm.updateAndSave({ active: false })
      const actual = await GroupMembership.hasActiveMembership(u, c1)
      expect(actual).to.equal(false)
    })
  })
})
