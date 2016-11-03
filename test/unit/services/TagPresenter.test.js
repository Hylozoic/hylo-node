var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import moment from 'moment'
import { find, times } from 'lodash/fp'
import { fetchAndPresentForCommunity } from '../../../api/services/TagPresenter.js'
describe('fetchAndPresentForCommunity', () => {
  var u1, u2, u3, u4, c1, t1, t2, t3, t4, t5

  before(() => {
    return setup.clearDb()
    .then(() => {
      [ u1, u2, u3, u4 ] = times(() => factories.user(), 4)
      ;[ t1, t2, t3, t4 ] = ['tagOne', 'tagTwo', 'tagThree', 'tagFourThatisnotinthecommunity']
        .map(name => new Tag({name}))
      c1 = factories.community()
      return Promise.map([u1, u2, u3, u4, t1, t2, t3, t4, c1], x => x.save())
    })
    .then(() => Promise.join(
      Promise.map([[u1.id, t1.id], [u1.id, t2.id], [u1.id, t3.id]], uIdtId =>
        new CommunityTag({
          user_id: uIdtId[0], tag_id: uIdtId[1], community_id: c1.id
        }).save()),
      Promise.map([
        [u1.id, t1.id],
        [u2.id, t1.id],
        [u1.id, t2.id],
        [u2.id, t2.id],
        [u3.id, t2.id],
        [u4.id, t2.id]
      ], uIdtId => new TagFollow({
        user_id: uIdtId[0], tag_id: uIdtId[1], community_id: c1.id
      }).save())))
    .then(() => {
      t5 = new Tag({name: 'tagFive'})
      return t5.save()
    })
    .then(() => new CommunityTag({
      user_id: u1.id, tag_id: t5.id, community_id: c1.id,
      created_at: moment().add(1, 'day')
    }).save())
  })

  it('fetches and presents, for Community', () => {
    return fetchAndPresentForCommunity(c1.id)
    .then(tags => {
      expect(tags.total).to.equal(4)
      const tagOne = find(t => t.name === 'tagOne', tags.items)
      expect(tagOne).to.exist
      expect(tagOne.memberships.length).to.equal(1)
      expect(tagOne.memberships[0].follower_count).to.equal(2)
      const tagTwo = find(t => t.name === 'tagTwo', tags.items)
      expect(tagTwo).to.exist
      expect(tagTwo.memberships.length).to.equal(1)
      expect(tagTwo.memberships[0].follower_count).to.equal(4)
      const tagThree = find(t => t.name === 'tagThree', tags.items)
      expect(tagThree).to.exist
      expect(tagThree.memberships.length).to.equal(1)
      expect(tagThree.memberships[0].follower_count).to.equal(0)
    })
  })

  it('sorts by popularity with popularity param', () => {
    return fetchAndPresentForCommunity(c1.id, {sort: 'popularity'})
    .then(tags => {
      expect(tags.total).to.equal(4)
      expect(tags.items.map(i => i.name)).to.deep.equal([
        'tagTwo',
        'tagOne',
        'tagThree',
        'tagFive'
      ])
    })
  })
})
