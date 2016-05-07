var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Media', () => {
  describe('.createForPost', () => {
    var post
    beforeEach(() => {
      post = factories.post()
      return post.save()
    })

    it('works as expected', function () {
      this.timeout(5000)
      return Media.createForPost(post.id, 'video', 'https://vimeo.com/70509133')
      .tap(video => video.load('post'))
      .then(video => {
        expect(video.id).to.exist
        expect(video.get('width')).to.equal(640)
        expect(video.get('height')).to.equal(360)
        expect(video.relations.post).to.exist
        expect(video.relations.post.id).to.equal(post.id)
      })
    })
  })
})
