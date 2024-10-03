import rootPath from 'root-path'
const factories = require(rootPath('test/setup/factories'))
import { refineMany, refineOne } from './relations'

describe('refineOne', () => {
  let post

  beforeEach(() => {
    post = factories.post({
      floofle: 'flarfle',
      id: 1,
      i_am_snake_case: 'sssssssss',
      morganflorfle: 'worble',
      slumptifargle: 99
    })
  })

  it('returns the specified subset of fields', () => {
    const expected = { floofle: 'flarfle' }
    const actual = refineOne(post, [ 'floofle' ])
    expect(actual).to.deep.equal(expected)
  })

  it('rewrites field names', () => {
    const expected = {
      aardvark: 'flarfle',
      id: 1,
      slumptifargle: 99,
    }
    const actual = refineOne(
      post,
      [ 'floofle', 'id', 'slumptifargle' ],
      { floofle: 'aardvark' }
    )
    expect(actual).to.deep.equal(expected)
  })

  it('converts snake_case to camelCase', () => {
    const expected = { iAmSnakeCase: 'sssssssss' }
    const actual = refineOne(post, [ 'i_am_snake_case' ])
    expect(actual).to.deep.equal(expected)
  })

  it('throws if fields is not an array', () => {
    expect(() => refineOne(post)).to.throw()
  })
})
