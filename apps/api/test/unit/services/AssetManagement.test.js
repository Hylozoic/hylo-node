require('../../setup')
const factories = require('../../setup/factories')
const defaultAvatarUrl = 'http://hylo-app.s3.amazonaws.com/misc/default_group_avatar.png'

describe('AssetManagement', () => {
  var group, origBucket

  before(() => {
    origBucket = process.env.AWS_S3_BUCKET
    process.env.AWS_S3_BUCKET = ''
    group = factories.group()
    return group.save({avatar_url: defaultAvatarUrl})
  })

  after(() => {
    process.env.AWS_S3_BUCKET = origBucket
  })

  describe('copyAsset', () => {
    it('throws an error if misconfigured', function () {
      const promise = AssetManagement.copyAsset(group, 'group', 'avatar_url')
      return expect(promise).to.eventually.be.rejected
    })
  })

  describe('resizeAsset', () => {
    it('throws an error if misconfigured', function () {
      const promise = AssetManagement.resizeAsset(group, 'avatar_url', {width: 200, height: 200})
      return expect(promise).to.eventually.be.rejected
    })
  })
})
