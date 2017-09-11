/* globals Uploader */

require('../../setup')

describe('Uploader', () => {
  it('rejects a call with no id', () => {
    return Uploader.upload({type: 'userAvatar', url: 'http://foo.com/foo.png'})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: No id')
    })
  })

  it('rejects a call with no url and no stream', () => {
    return Uploader.upload({type: 'userAvatar', id: 4})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: No url and no stream')
    })
  })

  it('rejects a call with an invalid type', () => {
    return Uploader.upload({type: 'foo', id: 7, url: 'http://foo.com/foo.png'})
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Invalid type')
    })
  })

  it('rejects a call changing a setting for another user', () => {
    return Uploader.upload({
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
    return Uploader.upload({
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
    return Uploader.upload({
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

  it('rejects a call changing a non existing post', () => {
    return Uploader.upload({
      userId: '6',
      type: 'post',
      id: '1234567',
      url: 'http://foo.com/foo.png'
    })
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('Validation error: Not allowed to edit this post')
    })
  })
})
