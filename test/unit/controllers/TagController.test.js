var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var TagController = require(root('api/controllers/TagController'))
import { extend, includes, times, zip } from 'lodash'
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
      c2: factories.community().save(),
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
          items: sortBy(t => t.name.toLowerCase(), [
            {
              id: t1.id,
              name: t1.get('name'),
              post_type: 'project',
              memberships: [
                {
                  community_id: c1.id,
                  description: 'hi',
                  created_at: null,
                  is_default: false,
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
                  is_default: false,
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
                  is_default: false,
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

  describe('.findOneSummary', () => {
    var locals
    const tagDescription = 'the tag for testing the summary api endpoint'
    const avatar_url = 'http://img.com/img.jpg'

    it('returns the relevant data', () => {
      return Promise.props({
        summaryTag: new Tag({name: 'summary'}).save(),
        u1: factories.user({avatar_url}).save(),
        u2: factories.user({avatar_url}).save(),
        u3: factories.user({avatar_url}).save(),
        u4: factories.user({avatar_url}).save()
      })
      .then(props => {
        locals = props
      })
      .then(() => {
        _.extend(req.params, {
          communityId: fixtures.c1.get('slug'),
          tagName: locals.summaryTag.get('name')
        })
      })
      .then(() => Promise.join(
        new CommunityTag({
          tag_id: locals.summaryTag.id,
          user_id: locals.u1.id,
          community_id: fixtures.c1.id,
          description: tagDescription
        }).save(),
        new CommunityTag({
          tag_id: locals.summaryTag.id,
          user_id: locals.u1.id,
          community_id: fixtures.c2.id,
          description: 'A community tag for the summary tag in a different community'
        }).save(),
        new TagFollow({tag_id: locals.summaryTag.id, user_id: locals.u2.id, community_id: fixtures.c1.id}).save(),
        new TagFollow({tag_id: locals.summaryTag.id, user_id: locals.u3.id, community_id: fixtures.c1.id}).save()))
      .then(() => factories.post({name: 'one untagged posts', user_id: locals.u1.id}).save()
        .then(post => post.communities().attach(fixtures.c1)))
      .then(() => {
        const userIds = [locals.u1.id, locals.u1.id, locals.u1.id, locals.u2.id, locals.u2.id, locals.u3.id, locals.u4.id, locals.u4.id]
        const communities = [fixtures.c1, fixtures.c1, fixtures.c1, fixtures.c1, fixtures.c1, fixtures.c1, fixtures.c2, fixtures.c2]

        return Promise.map(zip(userIds, communities), pair =>
          factories.post({user_id: pair[0]}).save()
          .tap(post => post.communities().attach(pair[1]))
          .then(post => post.tags().attach(locals.summaryTag)))
      })
      .then(() => TagController.findOneSummary(req, res))
      .then(() => {
        const expected = {
          description: tagDescription,
          active_members: [
            {name: locals.u1.get('name'), id: locals.u1.id, avatar_url: locals.u1.get('avatar_url'), post_count: 3},
            {name: locals.u2.get('name'), id: locals.u2.id, avatar_url: locals.u2.get('avatar_url'), post_count: 2},
            {name: locals.u3.get('name'), id: locals.u3.id, avatar_url: locals.u3.get('avatar_url'), post_count: 1}
          ],
          post_count: 6,
          follower_count: 2
        }
        expect(res.body).to.deep.equal(expected)
      })
    })
  })

  describe('.findOneInCommunity', () => {
    var locals, user, u1, tag
    const tagDescription = 'the tag for testing the findOneInCommunity endpoint'
    const person = userModel => ({
      name: userModel.get('name'),
      id: userModel.id,
      avatar_url: userModel.get('avatar_url') || null
    })

    beforeEach(() => {
      user = factories.user()
      u1 = factories.user({avatar_url: 'foo'})
      tag = new Tag({name: 'onefound'})
      res.locals.community = fixtures.c1
      Object.assign(req.params, {
        communityId: fixtures.c1.get('slug'),
        tagName: tag.get('name')
      })

      return Promise.join(user.save(), u1.save(), tag.save())
      .then(() => new CommunityTag({
        tag_id: tag.id,
        user_id: u1.id,
        community_id: fixtures.c1.id,
        description: tagDescription
      }).save())
    })

    it('allows public access', () => {
      return TagController.findOneInCommunity(req, res)
      .then(() => {
        expect(res.notFound).not.to.have.been.called()
        expect(res.ok).to.have.been.called()
        expect(res.body.followerCount).to.equal(0)
      })
    })

    it('returns the relevant data', () => {
      return Promise.props({
        u2: factories.user({avatar_url: 'http://foo.com/bar.png'}).save(),
        u3: factories.user().save(),
        u4: factories.user().save()
      })
      .then(props => locals = props)
      .then(() => req.session.userId = locals.u3.id)
      .then(() => new CommunityTag({
        tag_id: tag.id,
        user_id: locals.u2.id,
        community_id: fixtures.c2.id,
        description: 'A community tag for the onefound tag in a different community'
      }).save())
      .then(() => new TagFollow({tag_id: tag.id, user_id: locals.u2.id, community_id: fixtures.c1.id}).save())
      .then(() => new TagFollow({tag_id: tag.id, user_id: locals.u3.id, community_id: fixtures.c1.id}).save())
      // this is in a different community so the follower should not be returned
      .then(() => new TagFollow({tag_id: tag.id, user_id: locals.u4.id, community_id: fixtures.c2.id}).save())
      .then(() => TagController.findOneInCommunity(req, res))
      .then(() => {
        expect(res.body).to.contain({
          name: tag.get('name'),
          id: tag.id,
          description: tag.get('description'),
          followed: true,
          created: false,
          community_id: fixtures.c1.id
        })
        expect(res.body.owner).to.deep.equal(person(u1))
        expect(res.body.followers).to.deep.equal([
          person(locals.u3), person(locals.u2)
        ])
      })
    })
  })

  describe('.updateForCommunity', () => {
    var tag
    const newDescription = 'the updated description'

    it('updates the CommunityTag', () => {
      tag = new Tag({name: 'tobeupdated'})

      return tag.save()
      .then(() => _.extend(req.params, {
        communityId: fixtures.c1.get('slug'),
        description: newDescription,
        is_default: true,
        tagId: tag.id
      }))
      .then(() => new CommunityTag({
        tag_id: tag.id,
        community_id: fixtures.c1.id,
        description: 'A community tag soon to be updated',
        is_default: false
      }).save())
      .then(() => TagController.updateForCommunity(req, res))
      .then(() => CommunityTag.where({
        tag_id: tag.id,
        community_id: fixtures.c1.id
      }).fetch())
      .then(ct => {
        expect(ct.get('description')).to.equal(newDescription)
        expect(ct.get('is_default')).to.equal(true)
      })
    })
  })

  describe('.create', () => {
    it('creates a new Tag and Community Tag', () => {
      const description = 'the new tags description'
      const name = 'newtagcreatedbycreate'
      res.locals.community = fixtures.c1
      req.session.userId = fixtures.u1.id

      _.extend(req.params, {
        description,
        name,
        is_default: true
      })

      return TagController.create(req, res)
      .then(() => Tag.find(name))
      .then(tag => {
        expect(tag).to.exist
        return CommunityTag.where({community_id: fixtures.c1.id, tag_id: tag.id})
        .fetch()
        .then(communityTag => {
          expect(communityTag).to.exist
          expect(communityTag.get('description')).to.equal(description)
          expect(communityTag.get('is_default')).to.equal(true)
          expect(communityTag.get('user_id')).to.equal(fixtures.u1.id)
        })
      })
    })
  })
})
