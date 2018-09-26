import { makeFilterToggle, sharedNetworkMembership } from './filters'
import makeModels from './makeModels'
import { expectEqualQuery } from '../../test/setup/helpers'
import {
  myCommunityIdsSqlFragment, myNetworkCommunityIdsSqlFragment, blockedUserSqlFragment
} from '../models/util/queryFilters.test.helpers'
import factories from '../../test/setup/factories'

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
        where "group_memberships"."group_data_type" = ${Group.DataType.COMMUNITY}
        and "group_memberships"."user_id" in ('${myId}', '${User.AXOLOTL_ID}')
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
    var u1, u2, u3, u4, community;

    before(async () => {
      u1 = factories.user()
      u2 = factories.user()
      u3 = factories.user()
      u4 = factories.user()
      community = factories.community()
      await u1.save()
      await u2.save()
      await u3.save()
      await u4.save()
      await community.save()
      await u1.joinCommunity(community)
      await u2.joinCommunity(community)
      await u3.joinCommunity(community)
      await u4.joinCommunity(community)                  
      await BlockedUser.create(u1.id, u2.id)
      await BlockedUser.create(u3.id, u1.id)      
    })

    it('filters out blocked and blocking users', async () => {
      const models = await makeModels(u1.id, false)
      const users = await models.Person.filter(User.collection()).fetch()
      expect(users.map('id')).to.deep.equal([u1.id, u4.id])
    })    

    it.skip('filters down to people that share a community with the user', () => {
      const collection = models.Person.filter(User.collection())
      expectEqualQuery(collection, `select * from "users"
        where 
        ${blockedUserSqlFragment(42)}
        and
        ("users"."id" = '${User.AXOLOTL_ID}' or
          "users"."id" in
            (select "user_id"
            from "group_memberships"
            inner join "groups"
              on "groups"."id" = "group_memberships"."group_id"
            where ("groups"."group_data_id" in
              ${myCommunityIdsSqlFragment(42)}
                  or "groups"."group_data_id" in
                ${myNetworkCommunityIdsSqlFragment(42)})
                        and "group_memberships"."group_data_type" = 1))`)
    })
  })

  describe('Post', () => {
    it.skip('filters down to active in-network posts', () => {
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
    it.skip('filters down to active comments on in-network posts or followed posts', () => {
      const collection = models.Comment.filter(Comment.collection())
      expectEqualQuery(collection, `select distinct * from "comments"
        left join "communities_posts"
          on "comments"."post_id" = "communities_posts"."post_id"
        where "comments"."active" = true
        and (
          "comments"."post_id" in (
            select "group_data_id" from "group_memberships"
            inner join "groups"
              on "groups"."id" = "group_memberships"."group_id"
            where "group_memberships"."group_data_type" = 0
            and "group_memberships"."user_id" = '${myId}'
            and "group_memberships"."active" = true
            and ((group_memberships.settings->>'following')::boolean = true)
            and "groups"."active" = true
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
