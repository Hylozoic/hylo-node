import { makeFilterToggle, sharedNetworkMembership } from './filters'
import makeModels from './makeModels'
import { expectEqualQuery } from '../../test/setup/helpers'
import {
  myCommunityIdsSqlFragment, myNetworkCommunityIdsSqlFragment
} from '../models/util/queryFilters.test.helpers'

const myId = '42'

var models, sharedMemberships

describe('makeFilterToggle', () => {
  var filterFn = relation => relation.query(q => 'filtered')
  var relation = {query: fn => fn()}

  it('adds a filter when enabled', () => {
    expect(makeFilterToggle(true)(filterFn)(relation)).to.equal('filtered')
  })

  it('adds no filter when disabled', () => {
    expect(makeFilterToggle(false)(filterFn)(relation)).to.equal(relation)
  })
})

describe('model filters', () => {
  before(async () => {
    sharedMemberships = `"group_memberships"
      where "group_memberships"."active" = true
      and "group_memberships"."group_id" in (
        select "group_id" from "group_memberships"
        where "group_memberships"."user_id" in ('${myId}', '${User.AXOLOTL_ID}')
        and "group_memberships"."group_data_type" = ${Group.DataType.COMMUNITY}
        and "group_memberships"."active" = true
      )`

    models = await makeModels(myId, false)
  })

  describe('Membership', () => {
    it('filters down to memberships for communities the user is in', () => {
      const collection = models.Membership.filter(GroupMembership.collection())
      expectEqualQuery(collection, `select * from ${sharedMemberships}`)
    })
  })

  describe('Person', () => {
    it('filters down to people that share a community with the user', () => {
      const collection = models.Person.filter(User.collection())
      expectEqualQuery(collection, `select * from "users"
        where "users"."id" in (select "user_id" from ${sharedMemberships})`)
    })
  })

  describe('Post', () => {
    it('filters down to active in-network posts', () => {
      const collection = models.Post.filter(Post.collection())
      expectEqualQuery(collection, `select * from "posts"
        where "posts"."active" = true
        and "posts"."id" in (
          select "post_id" from "communities_posts"
          where (
            "community_id" in ${myCommunityIdsSqlFragment(myId)}
            or "community_id" in ${myNetworkCommunityIdsSqlFragment(myId)}
          )
        )`)
    })
  })

  describe('Comment', () => {
    it('filters down to active comments on in-network posts or followed posts', () => {
      const collection = models.Comment.filter(Comment.collection())
      expectEqualQuery(collection, `select distinct * from "comments"
        left join "communities_posts"
          on "comments"."post_id" = "communities_posts"."post_id"
        where "comments"."active" = true
        and (
          "comments"."post_id" in (
            select "group_data_id" from "groups"
            inner join "group_memberships"
              on "groups"."id" = "group_memberships"."group_id"
            where "groups"."group_data_type" = 0
            and "group_memberships"."active" = true
            and "groups"."active" = true
            and "group_memberships"."user_id" = '${myId}'
          )
          or ((
            "communities_posts"."community_id" in ${myCommunityIdsSqlFragment(myId)}
            or "communities_posts"."community_id" in ${myNetworkCommunityIdsSqlFragment(myId)}
          ))
        )`)
    })
  })
})

describe('sharedNetworkMembership', () => {
  it('supports a limited set of tables', () => {
    expect(() => {
      sharedNetworkMembership('foo', 42, Post.collection())
    }).to.throw(/does not support foo/)
  })
})
