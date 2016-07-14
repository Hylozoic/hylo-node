var setup = require(require('root-path')('test/setup'))

describe('PostMembership', function () {
  var post, community

  describe('.find', function () {
    before(function () {
      community = new Community({slug: 'foo', name: 'Foo'})
      post = new Post({name: 'Sup', description: 'details'})
      return setup.clearDb()
      .then(() => Promise.join(community.save(), post.save()))
      .then(() => post.communities().attach(community))
    })

    it('works with a community id', function () {
      return PostMembership.find(post.id, community.id)
      .then(membership => expect(membership).to.exist)
    })

    it('works with a community slug', function () {
      return PostMembership.find(post.id, community.get('slug'))
      .then(membership => expect(membership).to.exist)
    })

    it('returns nothing for a blank post id', function () {
      return PostMembership.find(null, community.id)
      .then(membership => expect(membership).not.to.exist)
    })
  })
})
