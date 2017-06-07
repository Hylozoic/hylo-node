import { makeFilterToggle } from './filters'
import makeModels from './makeModels'

describe('makeFilterToggle', () => {
  var relation, queryFn

  beforeEach(() => {
    queryFn = q => 'filtered'
    relation = {
      query: fn => fn()
    }
  })

  it('adds a filter when enabled', () => {
    expect(makeFilterToggle(true)(queryFn)(relation)).to.equal('filtered')
  })

  it('adds no filter when disabled', () => {
    expect(makeFilterToggle(false)(queryFn)(relation)).to.equal(relation)
  })
})

var models

describe('models', () => {
  before(() => {
    models = makeModels(42, false)
  })

  describe('Membership', () => {
    it('filters down to memberships for communities the user is in', () => {
      const collection = models.Membership.filter(Membership.collection())
      const querystring = collection.query().toString()
      expect(querystring).to.equal(`select * from "communities_users"
        where "communities_users"."community_id" in
          (select "community_id" from "communities_users"
          where "user_id" = 42 and "active" = true)`.replace(/\n\s*/g, ' '))
    })
  })

  describe('Person', () => {
    it('filters down to people that share a community with the user', () => {
      const collection = models.Person.filter(User.collection())
      const querystring = collection.query().toString()
      expect(querystring).to.equal(`select * from "users"
        where "users"."id" in
          (select "user_id" from "communities_users"
          where "communities_users"."community_id" in
            (select "community_id" from "communities_users"
            where "user_id" = 42 and "active" = true))`.replace(/\n\s*/g, ' '))
    })
  })

  describe('Post', () => {
    it('filters down to posts that share a community with the user', () => {
      const collection = models.Post.filter(Post.collection())
      const querystring = collection.query().toString()
      expect(querystring).to.equal(`select * from "posts"
        where "posts"."active" = true and "posts"."id" in
          (select "post_id" from "communities_posts"
          where "community_id" in
            (select "community_id" from "communities_users"
            where "user_id" = 42 and "active" = true))`.replace(/\n\s*/g, ' '))
    })
  })
})
