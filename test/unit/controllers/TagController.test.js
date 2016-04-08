var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var TagController = require(root('api/controllers/TagController'))

describe('TagController', () => {
  var req, res, fixtures

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
      .then(() => Promise.props({
        u1: new User({name: 'U1', email: 'a@b.c'}).save(),
        c1: factories.community().save(),
        t1: new Tag({name: 'tagone'}).save(),
        t2: new Tag({name: 'tagtwo'}).save(),
        t3: new Tag({name: 'tagthree'}).save()
      })
      .then(props => fixtures = props))
  })

  describe('#follow', () => {
    it('creates a FollowedTag', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: fixtures.t1.get('name')
      })

      return TagController.follow(req, res)
      .then(() => FollowedTag.where({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id
      }).fetch())
      .then(followedTag => {
        expect(followedTag).to.exist
      })
    })

    it('removes an existing FollowedTag', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: fixtures.t2.get('name')
      })

      return new FollowedTag({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).save()
      .then(() => TagController.follow(req, res))
      .then(() => FollowedTag.where({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).fetch())
      .then(followedTag => {
        expect(followedTag).to.not.exist
      })
    })
  })

  describe('#findFollowed', () => {
    it('returns followed tags', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug')
      })

      return new FollowedTag({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id
      }).save()
      .then(() => new FollowedTag({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).save())
      .then(() => TagController.findFollowed(req, res))
      .then(() => {
        expect(res.body.length).to.equal(2)
        var tagNames = res.body.map(t => t.name)
        expect(!!_.includes(tagNames, 'tagone')).to.equal(true)
        expect(!!_.includes(tagNames, 'tagtwo')).to.equal(true)
        expect(!!_.includes(tagNames, 'tagthree')).to.equal(false)
      })
    })
  })
})
