import { makePath } from './storage'
import mockRequire from 'mock-require'

describe('Uploader.storage.makePath', () => {
  let tmpEnvVar

  beforeEach(() => {
    tmpEnvVar = process.env.UPLOADER_PATH_PREFIX
    process.env.UPLOADER_PATH_PREFIX = 'all-the-things'
  })

  afterEach(() => {
    process.env.UPLOADER_PATH_PREFIX = tmpEnvVar
  })

  it('stores a file based on the user who uploaded it', () => {
    const fileType = {ext: 'png', mime: 'image/png'}
    expect(makePath('communityAvatar', 17, {userId: 41, fileType}))
    .to.match(/all-the-things\/user\/41\/communityAvatar\/17\/\d{13}_\d{4}\.png/)
  })

  it('uses an existing filename if present', () => {
    expect(makePath('post', 17, {userId: 41, filename: 'http://wow.com/foo.pdf?bar=1'}))
    .to.equal('all-the-things/user/41/post/17/foo.pdf')
  })

  it('uses default values', () => {
    expect(makePath('post', null, {filename: 'foo.pdf'}))
    .to.equal('all-the-things/user/system/post/new/foo.pdf')
  })
})

describe('Uploader.storage.createS3StorageStream', () => {
  let storage, listener

  before(() => {
    mockRequire('aws-sdk', {S3: mockS3})
    storage = mockRequire.reRequire('./storage')
    mockRequire.reRequire('aws-sdk')
  })

  after(() => mockRequire.stopAll())

  it('allows listening for a "progress" event', () => {
    const stream = storage.createS3StorageStream('comment', 1, {})
    stream.on('progress', listener)
    expect(stream.upload.isMock).to.be.true
    expect(stream.upload.on).to.have.been.called
    .with('httpUploadProgress', listener)
  })
})

class mockS3 {
  upload () {
    return {
      isMock: true,
      on: spy()
    }
  }
}
