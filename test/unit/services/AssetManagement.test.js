require('../../setup')
const factories = require('../../setup/factories')
const defaultAvatarUrl = 'http://hylo-app.s3.amazonaws.com/misc/default_community_avatar.png'

describe('AssetManagement', () => {
  var community, origBucket

  before(() => {
    origBucket = process.env.AWS_S3_BUCKET
    process.env.AWS_S3_BUCKET = ''
    community = factories.community()
    return community.save({avatar_url: defaultAvatarUrl})
  })

  after(() => {
    process.env.AWS_S3_BUCKET = origBucket
  })

  describe('copyAsset', () => {
    it('throws an error if misconfigured', function () {
      this.timeout(3000)
      const promise = AssetManagement.copyAsset(community, 'community', 'avatar_url')
      return expect(promise).to.eventually.be.rejected
    })
  })

  describe('resizeAsset', () => {
    it('throws an error if misconfigured', function () {
      this.timeout(3000)
      const promise = AssetManagement.resizeAsset(community, 'avatar_url', {width: 200, height: 200})
      return expect(promise).to.eventually.be.rejected
    })
  })
})
