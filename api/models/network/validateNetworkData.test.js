import validateNetworkData from './validateNetworkData'

describe('validateNetworkData', () => {
  it('fails if no name is provided', () => {
    const fn = () => validateNetworkData(null, {})
    expect(fn).to.throw(/title can't be blank/)
  })
})
