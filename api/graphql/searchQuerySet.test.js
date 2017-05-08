import { sanitizeOptions } from './searchQuerySet'

describe('sanitizeOptions', () => {
  it('sets default options', () => {
    expect(sanitizeOptions('forPosts', {})).to.deep.equal({
      limit: 100,
      offset: 0,
      sort: 'posts.updated_at',
      totalColumnName: '__total'
    })
  })

  it('does not override default options with null or undefined values', () => {
    expect(sanitizeOptions('forPosts', {
      sort: null, offset: undefined, foo: false
    }))
    .to.deep.equal({
      limit: 100,
      offset: 0,
      foo: false,
      sort: 'posts.updated_at',
      totalColumnName: '__total'
    })
  })

  it('throws an error when value of topic isn\'t an ID', () => {
    expect(() => {
      sanitizeOptions('forPosts', {topic: '123four'})
    }).to.throw(/invalid value for topic/)
  })
})
