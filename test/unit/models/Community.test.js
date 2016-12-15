const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
import { times } from 'lodash'

describe('Community', () => {
  it('can be created', function () {
    var community = new Community({slug: 'foo', name: 'foo', beta_access_code: 'foo!'})
    return community.save().then(() => {
      expect(community.id).to.exist
    })
  })

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Community.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('.popularSkills', () => {
    it('returns skills, sorted by popularity', () => {
      var community = new Community({slug: 'woo', name: 'woo', beta_access_code: 'woo!'})
      return community.save()
      .then(() => community.popularSkills())
      .then(popularSkills => expect(popularSkills).to.deep.equal([]))
      .then(() => Promise.join(
        Promise.map(['skill1', 'skill2', 'skill3'], skill => Tag.findOrCreate(skill)),
        Promise.map(times(3, () => factories.user()), u => u.save()),
        (tags, users) => Promise.join(
          users[0].tags().attach(tags[0]),
          users[0].tags().attach(tags[1]),
          users[0].tags().attach(tags[2]),
          users[1].tags().attach(tags[0]),
          users[1].tags().attach(tags[1]),
          users[2].tags().attach(tags[0]),
          Promise.map(users, u => u.joinCommunity(community)))))
        .then(() => community.popularSkills())
        .then(popularSkills => expect(popularSkills).to.deep.equal(['skill1', 'skill2', 'skill3']))
    })
  })
})
