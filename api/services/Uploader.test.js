import { upload } from './Uploader'

describe('Uploader', () => {
  it('rejects invalid types', () => {
    return upload({type: 'foo', id: 7})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal('Invalid type')
    })
  })
})
