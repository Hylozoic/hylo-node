var root = require('root-path')
var setup = require(root('test/setup'))
var DbAdapter = require(root('api/services/oidc/KnexAdapter'))

describe('OIDCKnexAdapter', function () {
  let adapter

  describe("Client adapter", () => {
    before(() => {
      adapter = new DbAdapter("Client")
    })

    it('gets setup correctly', () => {
      expect(adapter.name).to.equal("Client")
      expect(adapter.type).to.equal("Client")
    })

  })

})
