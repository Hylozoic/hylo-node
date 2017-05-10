const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('Tag', () => {
  let u

  beforeEach(() => {
    u = factories.user()
    return setup.clearDb()
      .then(() => u.save())
  })

  describe('updateForPost', () => {
    it('throws if type is invalid', () => {
      expect(() => Connection.create('1', '1', 'flargleargle'))
        .to.throw(/Invalid Connection type/)
    })
  })
})
