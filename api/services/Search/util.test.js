import { filterAndSortPosts, filterAndSortCommunities } from './util'
import { expectEqualQuery } from '../../../test/setup/helpers'

describe('filterAndSortPosts', () => {
  let relation, query

  beforeEach(() => {
    relation = Post.collection()
    relation.query(q => {
      query = q
      spy.on(q, 'join')
      spy.on(q, 'where')
    })
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

  it('allows topic IDs', () => {
    filterAndSortPosts({topic: '122'}, query)
    expect(query.join).to.have.been.called.with('posts_tags', 'posts_tags.post_id', 'posts.id')
    expect(query.where).to.have.been.called.with('posts_tags.tag_id', '122')
  })

  it('allows topic names', () => {
    filterAndSortPosts({topic: 'design'}, query)
    expect(query.join).to.have.been.called.twice
    expect(query.join.__spy.calls[0]).to.deep.equal([
      'posts_tags', 'posts_tags.post_id', 'posts.id'
    ])
    expect(query.join.__spy.calls[1]).to.deep.equal([
      'tags', 'posts_tags.tag_id', 'tags.id'
    ])
    expect(query.where).to.have.been.called.with('tags.name', 'design')
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
        "posts"."type" in ('discussion', 'request', 'offer', 'project', 'event')
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
