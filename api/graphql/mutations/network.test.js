import * as mutations from './network'

describe.only('network mutations', () => {
  let community, network, user

  before(() => {
    network = new Network({ name: 'Bargle' })
    user = new User({ email: 'flargle@bargle' })
    return Promise.all([ network.save(), user.save() ])
  })

  after(() => {
    return Promise.all([ network.destroy(), user.destroy() ])
  })

  describe('networkMutationPermissionCheck', () => {
    after(() => {
      return NetworkMembership.where('user_id', user.id).destroy()
    })

    it('does not throw when user is admin', () => {
      return expect(mutations.networkMutationPermissionCheck({
        isAdmin: true
      })).not.to.be.rejected
    })

    it('does not throw when user is network moderator', async () => {
      await NetworkMembership.addModerator(user.id, network.id)
      return expect(mutations.networkMutationPermissionCheck({
        userId: user.id,
        isAdmin: false
      }, network.id)).not.to.be.rejected
    })

    it('throws when user is not admin or network moderator', () => {
      return expect(mutations.networkMutationPermissionCheck({
        userId: user.id,
        isAdmin: false
      }, 99)).to.be.rejected
    })
  })

  describe('communities', () => {
    beforeEach(async () => {
      community = await new Community({ name: 'Wargle', slug: 'wargle' }).save()
    })

    afterEach(() => {
      return community.destroy()
    })

    describe('addCommunityToNetwork', () => {
      it('sets the correct network_id', async () => {
        await mutations.addCommunityToNetwork(
          { userId: user.id, isAdmin: true },
          { communityId: community.id, networkId: network.id }
        )
        await community.fetch({ withRelated: [ 'network' ] })
        expect(community.relations.network.id).to.equal(network.id)
      })
    })

    describe('removeCommunityFromNetwork', () => {
      it('removes the network relation', async () => {
        await community
          .save('network_id', network.id, { method: 'update', patch: true })
        await mutations.removeCommunityFromNetwork(
          { userId: user.id, isAdmin: true },
          { communityId: community.id, networkId: network.id }
        )
        await community.fetch({ withRelated: [ 'network' ] })
        expect(community.relations.network).to.equal(undefined)
      })
    })
  })

  describe('moderators', () => {
    afterEach(() => {
      return NetworkMembership.where('user_id', user.id).destroy()
    })

    describe('addNetworkModeratorRole', () => {
      it('throws if already a moderator', async () => {
        await NetworkMembership.addModerator(user.id, network.id)
        return expect(mutations.addNetworkModeratorRole(
          { userId: user.id },
          { personId: user.id, networkId: network.id }
        )).to.be.rejectedWith(/already has moderator/)
      })

      it('adds a moderator', async () => {
        await mutations.addNetworkModeratorRole(
          { isAdmin: true },
          { personId: user.id, networkId: network.id }
        )
        await network.fetch({ withRelated: [ 'moderators' ] })
        expect(network.relations.moderators.first().id).to.equal(user.id)
      })
    })

    describe('removeNetworkModeratorRole', () => {
      it('removes a moderator', async () => {
        await NetworkMembership.addModerator(user.id, network.id)
        await mutations.removeNetworkModeratorRole(
          { isAdmin: true },
          { personId: user.id, networkId: network.id }
        )
        await network.fetch({ withRelated: [ 'moderators' ] })
        expect(network.relations.moderators.length).to.equal(0)
      })
    })
  })
})
