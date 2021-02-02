import { expectEqualQuery } from '../../setup/helpers'
import {
  myGroupIdsSqlFragment
} from './Group.test.js'

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
      inner join "group_memberships"
        on "group_memberships"."user_id" = "skills_users"."user_id"
      where name ilike 'go%' and
        "group_memberships"."group_id" in ${myGroupIdsSqlFragment(myId)}
      order by upper("name") asc
      limit 10
      offset 20`)
  })
})
