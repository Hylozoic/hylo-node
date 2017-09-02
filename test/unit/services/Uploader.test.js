/* globals Uploader */

describe('Uploader', () => {
  it('rejects invalid types', () => {
    return Uploader.upload({type: 'foo', id: 7})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal('Validation error: Invalid type')
    })
  })
})
