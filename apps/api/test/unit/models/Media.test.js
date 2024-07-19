var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Media', () => {
  describe('.createForSubject', () => {
    var post
    beforeEach(() => {
      post = factories.post()
      return post.save()
    })

    it('works as expected', function () {
      this.timeout(5000)
      return Media.createForSubject({
        subjectType: 'post',
        subjectId: post.id,
        type: 'video',
        url: 'https://vimeo.com/70509133',
        position: 7
      })
      .tap(video => video.load('post'))
      .then(video => {
        expect(video.id).to.exist
        expect(video.get('width')).to.equal(640)
        expect(video.get('height')).to.equal(360)
        expect(video.get('position')).to.equal(7)
        expect(video.relations.post).to.exist
        expect(video.relations.post.id).to.equal(post.id)
      })
    })
  })

  describe('.findMediaUrlsForUser', () => {
    let user, post
    beforeEach(async () => {
      user = await new User({name: 'username', email: 'john@foo.com', active: true}).save()
      post = await factories.post({ description: '<p>hello <a class="mention" data-type="mention" data-id="334" data-label="John Doe">John Doe</a> #MOO</p>', user_id: user.id }).save()
      await Media.createForSubject({
        subjectType: 'post',
        subjectId: post.id,
        type: 'video',
        url: 'https://vimeo.com/70509133',
        position: 7
      })
    })

    it('returns the correct urls', async () => {
      const mediaUrls = await Media.findMediaUrlsForUser(user.id)
      const expectedUrls = ['https://vimeo.com/70509133', 'https://i.vimeocdn.com/video/555280788-3f8ee9b5a9a54434acff9809c8ab998c22d26487171a868747a1ac4220a15110-d_640']
      expect(mediaUrls).to.deep.equal(expectedUrls)
    })
  })
})
