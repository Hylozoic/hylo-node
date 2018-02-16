import '../../setup'
import factories from '../../setup/factories'
import { expectEqualQuery } from '../../setup/helpers'
import {
  myNetworkCommunityIdsSqlFragment
} from '../../../api/models/util/queryFilters.test.helpers'

describe('Network', () => {
  describe('.activeCommunityIds', () => {
    it('generates correct SQL', () => {
      expectEqualQuery(Network.activeCommunityIds('42', true),
        myNetworkCommunityIdsSqlFragment('42', {parens: false}), {isCollection: false})
    })
  })

  describe('.memberCount', () => {
    let network

    before(async () => {
      network = await factories.network().save()
      const c1 = await factories.community({network_id: network.id}).save()
      const c2 = await factories.community({network_id: network.id}).save()
      const u1 = await factories.user().save()
      const u2 = await factories.user().save()
      const u3 = await factories.user().save()
      await c1.addGroupMembers([u1, u2])
      await c2.addGroupMembers([u2, u3])
    })

    it('works', async () => {
      expect(await network.memberCount()).to.equal(3)
    })
  })
})
