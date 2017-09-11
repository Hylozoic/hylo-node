import { makePath } from './storage'

describe('Uploader.storage', () => {
  describe('makePath', () => {
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
      .to.match(/all-the-things\/user\/41\/communityAvatar_17_\d{13}_\d{4}\.png/)
    })

    it('uses an existing filename if present', () => {
      expect(makePath('communityAvatar', 17, {filename: 'foo.jpg'}))
      .to.match(/all-the-things\/user\/system\/communityAvatar_17_foo\.jpg/)
    })
  })
})
