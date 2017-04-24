import { sanitizeOptions } from '../../../api/graphql/searchQuerySet'

describe('sanitizeOptions', () => {
  it('sets default options', () => {
    expect(sanitizeOptions('forPosts', {})).to.deep.equal({
      limit: 100,
      offset: 0,
      sort: 'posts.updated_at',
      totalColumnName: '__total'
    })
  })
})
