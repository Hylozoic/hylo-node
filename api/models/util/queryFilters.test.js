import { myCommunityIds, myNetworkCommunityIds } from './queryFilters'
import { expectEqualQuery } from '../../../test/setup/helpers'
import {
  myCommunityIdsSqlFragment, myNetworkCommunityIdsSqlFragment
} from './queryFilters.test.helpers'

describe('myCommunityIds', () => {
  it('produces the expected query clause', () => {
    const query = Post.query(q => {
      q.join('communities_posts', 'posts.id', 'communities_posts.community_id')
      q.where('communities_posts.community_id', 'in', myCommunityIds('42'))
    })
    expectEqualQuery(query, `select * from "posts"
      inner join "communities_posts"
      on "posts"."id" = "communities_posts"."community_id"
      where "communities_posts"."community_id" in
      ${myCommunityIdsSqlFragment('42')}`)
  })
})

describe('myNetworkCommunityIds', () => {
  it('produces the expected query clause', () => {
    const query = Post.query(q => {
      q.join('communities_posts', 'posts.id', 'communities_posts.community_id')
      q.where('communities_posts.community_id', 'in', myNetworkCommunityIds('42'))
    })
    expectEqualQuery(query, `select * from "posts"
      inner join "communities_posts"
        on "posts"."id" = "communities_posts"."community_id"
      where "communities_posts"."community_id" in
      ${myNetworkCommunityIdsSqlFragment('42')}`)
  })
})
