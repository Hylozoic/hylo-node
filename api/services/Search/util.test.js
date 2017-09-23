import { filterAndSortPosts, filterAndSortCommunities } from './util'
import { expectEqualQuery } from '../../../test/setup/helpers'

describe('filterAndSortPosts', () => {
  let relation, query

  beforeEach(() => {
    relation = Post.collection()
    relation.query(q => { query = q })
  })

  it('accepts old sort values', () => {
    expect(() => {
      filterAndSortPosts({sortBy: 'posts.updated_at'}, query)
    }).not.to.throw()
  })

  it('accepts new sort values', () => {
    expect(() => {
      filterAndSortPosts({sortBy: 'updated'}, query)
    }).not.to.throw()
  })

  it('rejects bad sort values', () => {
    expect(() => {
      filterAndSortPosts({sortBy: 'foo'}, query)
    }).to.throw()
  })

  it('rejects bad topic values', () => {
    expect(() => {
      filterAndSortPosts({topic: '123four'}, query)
    }).to.throw(/invalid value for topic/)
  })

  it('rejects bad type values', () => {
    expect(() => {
      filterAndSortPosts({type: 'blah'}, query)
    }).to.throw(/unknown post type/)
  })

  it('includes basic types when filter is blank', () => {
    filterAndSortPosts({}, query)
    expectEqualQuery(relation, `select * from "posts"
      where (
        "posts"."type" in ('discussion', 'request', 'offer')
        or "posts"."type" is null
      )
      order by "posts"."updated_at" desc`)
  })

  it('includes null-typed posts as discussions', () => {
    filterAndSortPosts({type: 'discussion'}, query)
    expectEqualQuery(relation, `select * from "posts"
      where (
        "posts"."type" is null
        or ("posts"."type" = 'discussion')
      )
      order by "posts"."updated_at" desc`)
  })
})

describe('filterAndSortCommunities', () => {
  it('supports searching', () => {
    const relation = Community.collection()
    relation.query(q => {
      filterAndSortCommunities({search: 'foo'}, q)
    })

    expectEqualQuery(relation, `select * from "communities"
      where (
        ((to_tsvector('english', communities.name) @@ to_tsquery('foo:*')))
      )
      order by "name" asc`)
  })
})
