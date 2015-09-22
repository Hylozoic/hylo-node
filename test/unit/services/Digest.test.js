var root = require('root-path')
var setup = require(root('test/setup'))
var Digest = require(root('lib/community/digest'))
var moment = require('moment')

describe('Digest', function () {
  var community, user

  before(() => {
    community = new Community({name: 'foo', slug: 'foo'})
    user = new User({name: 'Cat', email: 'cat@cat.org'})

    return setup.clearDb()
    .then(() => community.save())
    .then(() => user.save())
    .then(() => user.joinCommunity(community))
    .then(() => new Post({user_id: user.id, name: 'Hi!'}).save())
    .then(post => community.posts().attach(post.id))
  })

  describe('.sendTestEmail', function () {
    it("doesn't throw errors", function () {
      this.timeout(5000)
      var digest = new Digest(community, moment(), moment().subtract(1, 'week'))
      return digest.fetchData().then(() => digest.sendTestEmail(user))
    })
  })
})
