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
  })
})
