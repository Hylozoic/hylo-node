import { expectEqualQuery } from '../../setup/helpers'

describe('Skill.find', () => {
  it('returns nothing for a null id', () => {
    return Skill.find(null)
    .then(skill => expect(skill).to.be.null)
  })
})

describe('Skill.search', () => {
  it('produces the expected query', () => {
    const query = Skill.search({
      autocomplete: 'go',
      currentUserId: 42,
      limit: 10,
      offset: 20
    })

    expectEqualQuery(query, `select * from "skills"
      inner join "skills_users"
        on "skills_users"."skill_id" = "skills"."id"
      inner join "communities_users"
        on "communities_users"."user_id" = "skills_users"."user_id"
      where name ilike 'go%' and (
        "communities_users"."community_id" in (
          select "community_id" from "communities_users"
          where "user_id" = 42 and "active" = true
        )
        or "communities_users"."community_id" in (
          select "id" from "communities" where "network_id" in (
            select distinct "network_id" from "communities" where "id" in (
              select "community_id" from "communities_users"
              where "user_id" = 42 and "active" = true
            )
            and network_id is not null
          )
        )
      )
      order by upper("name") asc
      limit 10
      offset 20`)
  })
})
