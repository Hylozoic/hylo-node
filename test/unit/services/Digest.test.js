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

  describe('.formatTime', function () {
    it('handles empty inputs', () => {
      expect(Digest.formatTime(null)).to.equal('')
    })

    it('handles a start time without an end time', () => {
      var start = new Date('2015-01-23 16:00:00Z')
      var expected = 'Friday, Jan 23, 2015 at 11:00 AM'
      expect(Digest.formatTime(start, null, 'America/New_York')).to.equal(expected)
    })

    it('handles a start and end time on the same day', () => {
      var start = new Date('2015-01-23 16:00:00Z')
      var end = new Date('2015-01-24 02:00:00Z')
      var expected = 'Friday, Jan 23, 2015 from 11:00 AM to 9:00 PM'
      expect(Digest.formatTime(start, end, 'America/New_York')).to.equal(expected)
    })

    it('handles a start and end time on different days', () => {
      var start = new Date('2015-01-23 16:00:00Z')
      var end = new Date('2015-01-25 01:00:00Z')
      var expected = 'Friday, Jan 23, 2015 at 11:00 AM to Saturday, Jan 24, 2015 at 8:00 PM'
      expect(Digest.formatTime(start, end, 'America/New_York')).to.equal(expected)
    })
  })
})
