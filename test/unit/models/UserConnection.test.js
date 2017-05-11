const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('UserConnection', () => {
  let u
  let u2

  beforeEach(() => {
    u = factories.user()
    u2 = factories.user()
    return setup.clearDb()
      .then(() => Promise.all([u.save(), u2.save()]))
  })

  describe('create', () => {
    it('throws if type is invalid', () => {
      expect(() => UserConnection.create('1', '2', 'flargleargle'))
        .to.throw(/Invalid UserConnection type/)
    })

    it('throws if other_user_id is user_id', () => {
      expect(() => UserConnection.create('1', '1', 'message'))
        .to.throw(/other_user_id cannot equal user_id/)
    })

    it('creates a UserConnection', () => {
      const u2 = factories.user()
      return u2.save()
        .then(() => {
          return UserConnection.create(u.get('id'), u2.get('id'), 'message')
        })
        .then(connection => connection.load('otherUser'))
        .then(({ relations }) => {
          const name = relations.otherUser.get('name')
          expect(name).to.equal(u2.get('name'))
        })
    })
  })

  describe('createOrUpdate', () => {
    it('creates a connection if one does not already exist', () => {
      return UserConnection.createOrUpdate(u.get('id'), u2.get('id'), 'message')
        .then(() => UserConnection.fetchAll())
        .then(connections => expect(connections.length).to.equal(1))
    })

    it('updates a connection if one already exists', () => {
      const user_id = u.get('id')
      const other_user_id = u2.get('id')
      const c = factories.userConnection({ user_id, other_user_id })
      return c.save()
        .then(() => UserConnection.createOrUpdate(user_id, other_user_id, 'message'))
        .then(() => UserConnection.fetchAll())
        .then(connections => {
          expect(connections.length).to.equal(1)
          const connection = connections.first()
          expect(connection.get('updated_at')).not.to.equal(c.get('updated_at'))
        })
    })
  })

  describe('find', () => {
    it('throws if user_id is missing', () => {
      expect(() => UserConnection.find())
        .to.throw(/Parameter user_id must be supplied/)
    })

    it('resolves with null if no matching connection exists', () => {
      const user_id = u.get('id')
      const other_user_id = u2.get('id')
      const c = factories.userConnection({ user_id: other_user_id, other_user_id: user_id })
      return c.save()
        .then(() => UserConnection.find(user_id, other_user_id, 'message'))
        .then(connection => expect(connection).to.equal(null))
    })

    it('finds a connection if a match exists', () => {
      const user_id = u.get('id')
      const other_user_id = u2.get('id')
      const c = factories.userConnection({ user_id, other_user_id })
      return c.save()
        .then(() => UserConnection.find(user_id, other_user_id, 'message'))
        .then(connection => expect(connection.get('id')).to.equal(c.get('id')))
    })
  })
})
