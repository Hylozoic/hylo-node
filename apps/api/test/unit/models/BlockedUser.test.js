const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('BlockedUser', () => {
  let u
  let u2

  beforeEach(() => {
    u = factories.user()
    u2 = factories.user()
    return setup.clearDb()
      .then(() => Promise.all([u.save(), u2.save()]))
  })

  describe('create', () => {
    it('throws if other_user_id is user_id', () => {
      expect(() => BlockedUser.create('1', '1'))
        .to.throw(/blocked_user_id cannot equal user_id/)
    })

    it('throws if user_id is null', () => {
      expect(() => BlockedUser.create(null, '1'))
        .to.throw(/must provide a user_id and blocked_user_id/)
    })

    it('creates a BlockedUser', () => {
      const u2 = factories.user()
      return u2.save()
        .then(() => {
          return BlockedUser.create(u.get('id'), u2.get('id'))
        })
        .then(blockedUser => blockedUser.load('blockedUser'))
        .then(({ relations }) => {
          const name = relations.blockedUser.get('name')
          expect(name).to.equal(u2.get('name'))
        })
    })
  })

  describe('find', () => {
    it('throws if user_id is missing', () => {
      expect(() => BlockedUser.find())
        .to.throw(/Parameter user_id must be supplied/)
    })

    it('resolves with null if no matching BlockedUser exists', () => {
      const user_id = u.get('id')
      const blocked_user_id = u2.get('id')
      const c = factories.blockedUser({ user_id: blocked_user_id, blocked_user_id: user_id })
      return c.save()
        .then(() => BlockedUser.find(user_id, blocked_user_id, 'message'))
        .then(blockedUser => expect(blockedUser).to.equal(null))
    })

    it('finds a BlockedUser if a match exists', () => {
      const user_id = u.get('id')
      const blocked_user_id = u2.get('id')
      const c = factories.blockedUser({ user_id, blocked_user_id })
      return c.save()
        .then(() => BlockedUser.find(user_id, blocked_user_id))
        .then(blockedUser => expect(blockedUser.get('id')).to.equal(c.get('id')))
    })
  })
})
