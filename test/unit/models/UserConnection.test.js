const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe.only('UserConnection', () => {
  let u

  beforeEach(() => {
    u = factories.user()
    return setup.clearDb()
      .then(() => u.save())
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
    let u2

    beforeEach(() => {
      u2 = factories.user()
      return u2.save()
    })

    it('creates a connection if one does not already exist', () => {
      return UserConnection.createOrUpdate(u.get('id'), u2.get('id'), 'message')
        .then(({ changed }) => expect(changed).to.deep.equal({}))
    })

    it('updates a connection if one already exists', () => {
      const c = factories.userConnection({ user_id: u.get('id'), other_user_id: u2.get('id') })
      return c.save()
        .then(() => UserConnection.createOrUpdate(u.get('id'), u2.get('id'), 'message'))
        .then(() => UserConnection.fetchAll())
        .then(connections => {
          expect(connections.length).to.equal(1)
          const connection = connections.first()
          expect(connection.get('updated_at')).not.to.equal(c.get('updated_at'))
        })
    })
  })
})
