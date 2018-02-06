import { expectEqualQuery } from '../../setup/helpers'
import {
  myCommunityIdsSqlFragment, myNetworkCommunityIdsSqlFragment
} from '../../../api/models/util/queryFilters.test.helpers'

describe('Skill.find', () => {
  it('returns nothing for a null id', () => {
    return Skill.find(null)
    .then(skill => expect(skill).to.be.null)
  })
})

describe('Skill.search', () => {
  let myId = '42'

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
        "communities_users"."community_id" in ${myCommunityIdsSqlFragment(myId)}
        or "communities_users"."community_id" in ${myNetworkCommunityIdsSqlFragment(myId)}
      )
      order by upper("name") asc
      limit 10
      offset 20`)
  })
})
