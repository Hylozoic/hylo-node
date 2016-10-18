var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import moment from 'moment'
import { find } from 'lodash/fp'
import { fetchAndPresentForCommunity } from '../../../api/services/TagPresenter.js'
describe('fetchAndPresentForCommunity', () => {
  var fixtures

  before(() => {
    return setup.clearDb()
    .then(() => Promise.props({
      u1: factories.user().save(),
      u2: factories.user().save(),
      u3: factories.user().save(),
      u4: factories.user().save(),
      c1: factories.community().save(),
      t1: new Tag({name: 'tagOne'}).save(),
      t2: new Tag({name: 'tagTwo'}).save(),
      t3: new Tag({name: 'tagThree'}).save(),
      t4: new Tag({name: 'tagFourThatisnotinthecommunity'}).save()
    })
    .then(props => fixtures = props))
    .then(() => Promise.join(
      new CommunityTag({
        user_id: fixtures.u1.id, tag_id: fixtures.t1.id, community_id: fixtures.c1.id
      }).save(),
      new CommunityTag({
        user_id: fixtures.u1.id, tag_id: fixtures.t2.id, community_id: fixtures.c1.id
      }).save(),
      new CommunityTag({
        user_id: fixtures.u1.id, tag_id: fixtures.t3.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u1.id, tag_id: fixtures.t2.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u2.id, tag_id: fixtures.t2.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u3.id, tag_id: fixtures.t2.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u4.id, tag_id: fixtures.t2.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u1.id, tag_id: fixtures.t1.id, community_id: fixtures.c1.id
      }).save(),
      new TagFollow({
        user_id: fixtures.u2.id, tag_id: fixtures.t1.id, community_id: fixtures.c1.id
      }).save()
    ))
    .then(() => {
      fixtures.t5 = new Tag({name: 'tagFive'})
      return fixtures.t5.save()
    })
    .then(() => {
      new CommunityTag({
        user_id: fixtures.u1.id, tag_id: fixtures.t5.id, community_id: fixtures.c1.id,
        created_at: moment().add(1, 'day')
      }).save()
    })
  })

  it('fetches and presents, for Community', () => {
    return fetchAndPresentForCommunity(fixtures.c1.id)
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
    return fetchAndPresentForCommunity(fixtures.c1.id, {sort: 'popularity'})
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
