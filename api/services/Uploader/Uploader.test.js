import { upload } from '../Uploader'

describe('Uploader', () => {
  it('rejects a call with no id', () => {
    return upload({type: 'userAvatar', url: 'http://foo.com/foo.png'})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: No id')
    })
  })

  it('rejects a call with no url and no stream', () => {
    return upload({type: 'userAvatar', id: 4})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: No url and no stream')
    })
  })

  it('rejects a call with an invalid type', () => {
    return upload({type: 'foo', id: 7, url: 'http://foo.com/foo.png'})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Invalid type')
    })
  })

  it('rejects a call changing a setting for another user', () => {
    return upload({
      type: 'userBanner',
      userId: '6',
      id: '7',
      url: 'http://foo.com/foo.png'
    })
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Not allowed to change settings for another person')
    })
  })

  it('rejects a call changing a non-moderated or nonexistent community', () => {
    return upload({
      userId: '6',
      type: 'communityBanner',
      id: '7',
      url: 'http://foo.com/foo.png'
    })
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Not a moderator of this community')
    })
  })

  it('rejects a call changing a non-moderated or nonexistent network', () => {
    return upload({
      userId: '6',
      type: 'networkBanner',
      id: '7',
      url: 'http://foo.com/foo.png'
    })
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Not a moderator of this network')
    })
  })
})
