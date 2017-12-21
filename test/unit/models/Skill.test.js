import { expectEqualQuery } from '../../setup/helpers'

describe('Skill.find', () => {
  it('returns nothing for a null id', () => {
    return Skill.find(null)
    .then(skill => expect(skill).to.be.null)
  })
})

describe('Skill.search', () => {
  let myId = '42'
  let selectMyCommunityIds, selectMyNetworkCommunityIds

  before(() => {
    selectMyCommunityIds = `(select "group_data_id" from "groups"
      inner join "group_memberships"
      on "groups"."id" = "group_memberships"."group_id"
      where "groups"."group_data_type" = ${Group.DataType.COMMUNITY}
      and "group_memberships"."active" = true
      and "groups"."active" = true
      and "group_memberships"."user_id" = '${myId}')`

    selectMyNetworkCommunityIds = `(select "id" from "communities"
      where "network_id" in (
        select distinct "network_id" from "communities"
        where "id" in ${selectMyCommunityIds}
        and network_id is not null
      ))`
  })

  it('produces the expected query', () => {
    const query = Skill.search({
      autocomplete: 'go',
      currentUserId: myId,
      limit: 10,
      offset: 20
    })

    expectEqualQuery(query, `select * from "skills"
      inner join "skills_users"
        on "skills_users"."skill_id" = "skills"."id"
      inner join "communities_users"
        on "communities_users"."user_id" = "skills_users"."user_id"
      where name ilike 'go%' and (
        "communities_users"."community_id" in ${selectMyCommunityIds}
        or "communities_users"."community_id" in ${selectMyNetworkCommunityIds}
      )
      order by upper("name") asc
      limit 10
      offset 20`)
  })
})
