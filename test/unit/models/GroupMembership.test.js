const root = require('root-path')
const setup = require(root('test/setup'))
const { spyify, unspyify } = require(root('test/setup/helpers'))
const factories = require(root('test/setup/factories'))

describe('GroupMembership', () => {
  before(async () => setup.clearDb())

  describe('forPair', () => {
    let c, u

    before(async () => {
      c = await factories.group().save()
      u = await factories.user().save()
    })

    it('should throw if no user', () => {
      expect(() => GroupMembership.forPair()).to.throw(/user or user id/)
    })

    it('should throw if no instance', () => {
      expect(() => GroupMembership.forPair(u)).to.throw(/without a group/)
    })

    it('should invoke forIds with the correct ids and model', async () => {
      spyify(GroupMembership, 'forIds')
      await GroupMembership.forPair(u, c)
      expect(GroupMembership.forIds).to.have.been.called.with(u.id, c.id, c.constructor)
      unspyify(GroupMembership, 'forIds')
    })
  })

  describe('hasActiveMembership', () => {
    let u, c1, c2, gm

    before(async () => {
      u = await factories.user().save()
      c1 = await factories.group().save()
      c2 = await factories.group().save()
      gm = await u.joinGroup(c1)
    })

    it('returns true if user is a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, c1)
      expect(actual).to.equal(true)
    })

    it('returns false if user is not a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, c2)
      expect(actual).to.equal(false)
    })

    it('returns false if user is an inactive member', async () => {
      await gm.updateAndSave({ active: false })
      const actual = await GroupMembership.hasActiveMembership(u, c1)
      expect(actual).to.equal(false)
    })
  })
})
