var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var TagController = require(root('api/controllers/TagController'))
import { times } from 'lodash'
import { sortBy } from 'lodash/fp'

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

  describe('.follow', () => {
    it('creates a TagFollow', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: fixtures.t1.get('name')
      })

      return TagController.follow(req, res)
      .then(() => TagFollow.where({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id
      }).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
    })

    it('removes an existing TagFollow', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: fixtures.t2.get('name')
      })

      return new TagFollow({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).save()
      .then(() => TagController.follow(req, res))
      .then(() => TagFollow.where({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.not.exist
      })
    })
  })

  describe('.findFollowed', () => {
    it('returns followed tags', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug')
      })

      return new TagFollow({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id
      }).save()
      .then(() => new TagFollow({
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

  describe('.findForLeftNav', () => {
    it('returns followed and created tags ', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug')
      })

      return new TagFollow({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id,
        new_post_count: 4
      }).save()
      .then(() => new TagFollow({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id,
        new_post_count: 5
      }).save())
      .then(() => new CommunityTag({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t2.id,
        user_id: fixtures.u1.id
      }).save())
      .then(() => TagController.findForLeftNav(req, res))
      .then(() => {
        expect(res.body.followed.length).to.equal(1)
        expect(res.body.followed[0].name).to.equal('tagone')
        expect(res.body.followed[0].new_post_count).to.equal(4)
        expect(res.body.created.length).to.equal(1)
        expect(res.body.created[0].name).to.equal('tagtwo')
        expect(res.body.created[0].new_post_count).to.equal(5)
      })
    })
  })

  describe('.resetNewPostCount', () => {
    it('resets new_post_count to 0', () => {
      req.session.userId = fixtures.u1.id
      _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: fixtures.t1.get('name')
      })

      return new TagFollow({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id,
        new_post_count: 7
      }).save()
      .then(() => TagController.resetNewPostCount(req, res))
      .then(() => TagFollow.where({
        community_id: fixtures.c1.id,
        tag_id: fixtures.t1.id,
        user_id: fixtures.u1.id
      }).fetch())
      .then(tagFollow => {
        expect(tagFollow.get('new_post_count')).to.equal(0)
      })
    })
  })

  describe('.findForCommunity', () => {
    var t1, t2, t3, t4, u1, u2, c1, c2, p
    beforeEach(() => {
      ;[t1, t2, t3, t4] = times(4, () => factories.tag())
      ;[u1, u2] = times(2, () => factories.user())
      ;[c1, c2] = times(2, () => factories.community())
      p = factories.post({type: 'project'})

      return Promise.map([t1, t2, t3, t4, u1, u2, c1, c2, p], x => x.save())
      .then(() => Promise.join(
        c1.tags().attach({tag_id: t1.id, user_id: u1.id, description: 'hi'}),
        c1.tags().attach({tag_id: t2.id}),
        c1.tags().attach({tag_id: t3.id}),
        c2.tags().attach({tag_id: t4.id}),
        p.tags().attach({tag_id: t1.id, selected: true})
      ))
      .then(() => Promise.join(
        u2.followedTags().attach({tag_id: t1.id, community_id: c1.id}),
        u1.followedTags().attach({tag_id: t2.id, community_id: c1.id}),
        u2.followedTags().attach({tag_id: t2.id, community_id: c1.id}),
        u1.followedTags().attach({tag_id: t1.id, community_id: c2.id})
      ))
    })

    it('returns the expected data', () => {
      res.locals.community = c1

      return TagController.findForCommunity(req, res)
      .then(() => {
        expect(res.body).to.deep.equal({
          items: sortBy('name', [
            {
              id: t1.id,
              name: t1.get('name'),
              post_type: 'project',
              memberships: [
                {
                  community_id: c1.id,
                  description: 'hi',
                  created_at: null,
                  follower_count: 1,
                  owner: {
                    id: u1.id,
                    name: u1.get('name'),
                    avatar_url: null
                  }
                }
              ]
            },
            {
              id: t2.id,
              name: t2.get('name'),
              memberships: [
                {
                  community_id: c1.id,
                  description: null,
                  created_at: null,
                  follower_count: 2,
                  owner: {}
                }
              ]
            },
            {
              id: t3.id,
              name: t3.get('name'),
              memberships: [
                {
                  community_id: c1.id,
                  description: null,
                  created_at: null,
                  follower_count: 0,
                  owner: {}
                }
              ]
            }
          ]),
          total: 3
        })
      })
    })
  })
})
