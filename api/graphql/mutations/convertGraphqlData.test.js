import convertGraphqlData from './convertGraphqlData'

describe('convertGraphqlData', () => {
  it('returns null when given null as an argument', () => {
    expect(convertGraphqlData(null)).to.equal(null)
  })
})
