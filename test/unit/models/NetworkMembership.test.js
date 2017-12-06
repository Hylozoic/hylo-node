var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('NetworkMembership', () => {
  describe('.addModerator', () => {
    var u, n

    before(() => {
      u = factories.user()
      n = factories.network()

      return Promise.join(u.save(), n.save())
    })

    it('adds the NetworkMembership', () => {
      return NetworkMembership.addModerator(u.id, n.id)
      .then(() => NetworkMembership.where({
        user_id: u.id,
        network_id: n.id
      }).fetch())
      .then(networkMembership => {
        expect(networkMembership).to.exist
        expect(networkMembership.get('role'))
        .to.equal(NetworkMembership.MODERATOR_ROLE)
      })
    })
  })

  describe('.addAdmin', () => {
    var u, n

    before(() => {
      u = factories.user()
      n = factories.network()

      return Promise.join(u.save(), n.save())
    })

    it('adds the NetworkMembership', () => {
      return NetworkMembership.addAdmin(u.id, n.id)
      .then(() => NetworkMembership.where({
        user_id: u.id,
        network_id: n.id
      }).fetch())
      .then(networkMembership => {
        expect(networkMembership).to.exist
        expect(networkMembership.get('role'))
        .to.equal(NetworkMembership.ADMIN_ROLE)
      })
    })
  })

  describe('.hasModeratorRole', () => {
    var u, n

    before(() => {
      u = factories.user()
      n = factories.network()

      return Promise.join(u.save(), n.save())
    })

    it('returns false with no membership, true with moderator membership', () => {
      return NetworkMembership.hasModeratorRole(u.id, n.id)
      .then(isMod => {
        expect(isMod).to.be.false
      })
      .then(() => NetworkMembership.addModerator(u.id, n.id))
      .then(() => NetworkMembership.hasModeratorRole(u.id, n.id))
      .then(isMod => {
        expect(isMod).to.be.true
      })
    })
  })

  describe('.hasAdminRole', () => {
    var u, n

    before(() => {
      u = factories.user()
      n = factories.network()

      return Promise.join(u.save(), n.save())
    })

    it('returns false with no membership, true with moderator membership', () => {
      return NetworkMembership.hasAdminRole(u.id, n.id)
      .then(isMod => {
        expect(isMod).to.be.false
      })
      .then(() => NetworkMembership.addAdmin(u.id, n.id))
      .then(() => NetworkMembership.hasModeratorRole(u.id, n.id))
      .then(isMod => {
        expect(isMod).to.be.true
      })
    })
  })
})
