import { myCommunityIds, myNetworkCommunityIds } from './queryFilters'
import { expectEqualQuery } from '../../../test/setup/helpers'

describe('myCommunityIds', () => {
  it('produces the expected query clause', () => {
    const query = Post.query(q => {
      q.join('communities_posts', 'posts.id', 'communities_posts.community_id')
      q.where('communities_posts.community_id', 'in', myCommunityIds(42))
    })
    expectEqualQuery(query, `select * from "posts"
      inner join "communities_posts"
        on "posts"."id" = "communities_posts"."community_id"
      where "communities_posts"."community_id" in (
        select "community_id" from "communities_users"
        where "user_id" = 42 and "active" = true
      )`)
  })
})

describe('myNetworkCommunityIds', () => {
  it('produces the expected query clause', () => {
    const query = Post.query(q => {
      q.join('communities_posts', 'posts.id', 'communities_posts.community_id')
      q.where('communities_posts.community_id', 'in', myNetworkCommunityIds(42))
    })
    expectEqualQuery(query, `select * from "posts"
      inner join "communities_posts"
        on "posts"."id" = "communities_posts"."community_id"
      where "communities_posts"."community_id" in (
        select "id" from "communities" where "network_id" in (
          select distinct "network_id" from "communities"
          where "id" in (
            select "community_id" from "communities_users"
            where "user_id" = 42 and "active" = true
          )
        and network_id is not null
      )
    )`)
  })
})
