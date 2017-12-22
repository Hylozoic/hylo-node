import '../../setup'
import factories from '../../setup/factories'
import { expectEqualQuery } from '../../setup/helpers'

describe('Network', () => {
  describe('.activeCommunityIds', () => {
    it('generates correct SQL', () => {
      expectEqualQuery(Network.activeCommunityIds(42, true),
        `select "id" from "communities"
          where "network_id" in (
            select distinct "network_id" from "communities"
            where "id" in (
              select "group_data_id" from "groups"
              inner join "group_memberships"
              on "groups"."id" = "group_memberships"."group_id"
              where "groups"."group_data_type" = 1
              and "group_memberships"."active" = true
              and "groups"."active" = true
              and "group_memberships"."user_id" = 42
            )
            and network_id is not null
          )`, {isCollection: false})
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
