import { upload, guessFileType } from './index'
import { Readable } from 'stream'

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

  it('rejects a call changing a non-moderated or nonexistent group', () => {
    return upload({
      userId: '6',
      type: 'groupBanner',
      id: '7',
      url: 'http://foo.com/foo.png'
    })
      .then(() => expect.fail('should reject'))
      .catch(err => {
        expect(err.message).to.equal('Validation error: Not an administrator of this group')
      })
  })

  it('rejects a call changing a nonexistent post', () => {
    return upload({
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

  it('rejects if the source emits an error', () => {
    const stream = new Readable({
      read (size) {
        if (!this.readCount) this.readCount = 1
        this.readCount++
        if (this.readCount > 2) {
          this.emit('error', new Error('wow'))
        }
        setTimeout(() => this.push('i'), 5)
      }
    })

    return upload({
      userId: '10',
      type: 'userBanner',
      id: '10',
      stream
    })
    .then(() => expect.fail('should reject'))
    .catch(err => {
      expect(err.message).to.equal('wow')
    })
  })

  it('properly identifies an Open Office document', () => {
    const docxBuffer = Buffer.from(
      '504b03041400080808006f1c934b00000000000000000000000018000000786c2f64726177696e67732f64726177696e6731',
      'hex'
    )
    const result = guessFileType(docxBuffer, 'any.docx')
    expect(result.ext).to.equal('docx')
  })
})
