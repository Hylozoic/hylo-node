import { makeFilterToggle } from './filters'
import makeModels from './makeModels'
import { expectEqualQuery } from '../../test/setup/helpers'

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

const myId = 42

const selectMyCommunityIds = `(select "community_id" from "communities_users"
  where "user_id" = ${myId} and "active" = true)`

const selectMyNetworkCommunityIds = `(select "id" from "communities"
  where "network_id" in (
    select distinct "network_id" from "communities"
    where "id" in ${selectMyCommunityIds}
    and network_id is not null
  ))`

var models

describe('model filters', () => {
  before(() => {
    models = makeModels(myId, false)
  })

  describe('Membership', () => {
    it('filters down to memberships for communities the user is in', () => {
      const collection = models.Membership.filter(Membership.collection())
      expectEqualQuery(collection, `select * from "communities_users"
        where "communities_users"."community_id" in ${selectMyCommunityIds}`)
    })
  })

  describe('Person', () => {
    it('filters down to people that share a community with the user', () => {
      const collection = models.Person.filter(User.collection())
      expectEqualQuery(collection, `select * from "users"
        where "users"."id" in (
          select "user_id" from "communities_users"
          where "communities_users"."community_id" in ${selectMyCommunityIds}
        )`)
    })
  })

  describe('Post', () => {
    it('filters down to active in-network posts', () => {
      const collection = models.Post.filter(Post.collection())
      expectEqualQuery(collection, `select * from "posts"
        inner join "communities_posts"
          on "posts"."id" = "communities_posts"."post_id"
        where "posts"."active" = true
        and (
          "communities_posts"."community_id" in ${selectMyCommunityIds}
          or "communities_posts"."community_id" in ${selectMyNetworkCommunityIds}
        )`)
    })
  })

  describe('Comment', () => {
    it('filters down to active comments on in-network posts or followed posts', () => {
      const collection = models.Comment.filter(Comment.collection())
      expectEqualQuery(collection, `select * from "comments"
        left join "communities_posts"
          on "comments"."post_id" = "communities_posts"."post_id"
        where "active" = true
        and (
          "comments"."post_id" in (
            select "post_id" from "follows" where "user_id" = 42
          )
          or ((
            "communities_posts"."community_id" in ${selectMyCommunityIds}
            or "communities_posts"."community_id" in ${selectMyNetworkCommunityIds}
          ))
        )`)
    })
  })
})
