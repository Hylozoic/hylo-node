var setup = require(require('root-path')('test/setup'))

describe('Tag', () => {
  before(() => {
    return setup.clearDb()
  })

  describe('updateForPost', () => {
    it('creates a tag from tag param', () => {
      var post = new Post({
        name: 'New Tagged Post',
        description: 'no tags in the body'
      })
      return post.save()
      .then(post => Tag.updateForPost(post, 'newtagone'))
      .then(() => Tag.find('newtagone', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.name).to.equal('newtagone')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts[0].name).to.equal('New Tagged Post')
      })
    })
  })
})
