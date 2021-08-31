var setup = require(require('root-path')('test/setup'))

describe('PostMembership', function () {
  var post, group

  describe('.find', function () {
    before(function () {
      group = new Group({slug: 'foo', name: 'Foo', group_data_type: 1})
      post = new Post({name: 'Sup', description: 'details'})
      return setup.clearDb()
      .then(() => Promise.join(group.save(), post.save()))
      .then(() => post.groups().attach(group))
    })

    it('works with a group id', function () {
      return PostMembership.find(post.id, group.id)
      .then(membership => expect(membership).to.exist)
    })

    it('works with a group slug', function () {
      return PostMembership.find(post.id, group.get('slug'))
      .then(membership => expect(membership).to.exist)
    })

    it('returns nothing for a blank post id', function () {
      return PostMembership.find(null, group.id)
      .then(membership => expect(membership).not.to.exist)
    })
  })
})
