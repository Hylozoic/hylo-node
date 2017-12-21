import '../../setup'
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
})
