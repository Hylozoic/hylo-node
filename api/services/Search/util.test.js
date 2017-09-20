import { filterAndSortPosts, filterAndSortCommunities } from './util'
import { expectEqualQuery } from '../../../test/setup/helpers'

describe('filterAndSortPosts', () => {
  let query

  before(() => {
    query = {
      join: spy(() => {}),
      whereIn: spy(() => {}),
      orderBy: spy(() => {}),
      orderByRaw: spy(() => {})
    }
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
