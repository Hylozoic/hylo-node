var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('PostPresenter', () => {
  var post

  before(() => {
    post = factories.post()
    return post.save()
  })

  it('handles an empty post', () => {
    return Post.find(post.id, {withRelated: PostPresenter.relations()})
    .then(PostPresenter.present)
  })
})
