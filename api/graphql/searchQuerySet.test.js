import searchQuerySet, { sanitizeOptions } from './searchQuerySet'
import { mockify, unspyify } from '../../test/setup/helpers'

describe('searchQuerySet', () => {
  before(() => mockify(Skill, 'search'))
  after(() => unspyify(Skill, 'search'))

  it('can search for skills', () => {
    searchQuerySet('skills', {})
    expect(Skill.search).to.have.been.called()
  })
})

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

  describe('for posts', () => {
    it('throws an error when sort option is invalid', () => {
      expect(() => {
        sanitizeOptions('forPosts', {sort: 'size'})
      }).to.throw(/invalid value for sort/)
    })

    it('throws an error when value of topic is not an ID', () => {
      expect(() => {
        sanitizeOptions('forPosts', {topic: '123four'})
      }).to.throw(/invalid value for topic/)
    })
  })

  it('sets tag based on topic', () => {
    expect(sanitizeOptions('forPosts', {topic: '7'})).to.deep.equal({
      limit: 100,
      offset: 0,
      totalColumnName: '__total',
      sort: 'posts.updated_at',
      tag: '7'
    })
  })

  it('sets limit based on first', () => {
    expect(sanitizeOptions('forSkills', {first: 5})).to.deep.equal({
      limit: 5,
      offset: 0,
      totalColumnName: '__total'
    })
  })
})
