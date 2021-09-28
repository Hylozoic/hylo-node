const root = require('root-path')
const setup = require(root('test/setup'))
const { spyify, unspyify } = require(root('test/setup/helpers'))
const factories = require(root('test/setup/factories'))

describe('GroupMembership', () => {
  before(async () => setup.clearDb())

  describe('forPair', () => {
    let g, u

    before(async () => {
      g = await factories.group().save()
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
      await GroupMembership.forPair(u, g)
      expect(GroupMembership.forIds).to.have.been.called.with(u.id, g.id, {})
      unspyify(GroupMembership, 'forIds')
    })
  })

  describe('hasActiveMembership', () => {
    let u, g1, g2, gm

    before(async () => {
      u = await factories.user().save()
      g1 = await factories.group().save()
      g2 = await factories.group().save()
      gm = await u.joinGroup(g1)
    })

    it('returns true if user is a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, g1)
      expect(actual).to.equal(true)
    })

    it('returns false if user is not a member', async () => {
      const actual = await GroupMembership.hasActiveMembership(u, g2)
      expect(actual).to.equal(false)
    })

    it('returns false if user is an inactive member', async () => {
      await gm.updateAndSave({ active: false })
      const actual = await GroupMembership.hasActiveMembership(u, g1)
      expect(actual).to.equal(false)
    })
  })
})
