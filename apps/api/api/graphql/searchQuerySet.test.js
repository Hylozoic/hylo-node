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
      totalColumnName: '__total'
    })
  })

  it('does not override default options with null or undefined values', () => {
    expect(sanitizeOptions('forPosts', {
      offset: undefined, foo: false
    }))
    .to.deep.equal({
      limit: 100,
      offset: 0,
      foo: false,
      totalColumnName: '__total'
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
