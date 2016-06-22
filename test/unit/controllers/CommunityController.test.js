var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var Promise = require('bluebird')
var checkAndSetMembership = Promise.promisify(require(require('root-path')('api/policies/checkAndSetMembership')))
var CommunityController = require(root('api/controllers/CommunityController'))
import { sortBy, times } from 'lodash'

describe('CommunityController', () => {
  var req, res, user

  before(() => {
    user = factories.user()
    return user.save()
  })

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('.findOne', () => {
    var community

    beforeEach(() => {
      community = factories.community({beta_access_code: 'sekrit'})
      return community.save()
      .then(() => user.joinCommunity(community))
      .then(() => {
        req.params.communityId = community.id
        req.session.userId = user.id
      })
    })

    it('does not include the invitation code', () => {
      return checkAndSetMembership(req, res)
      .then(() => CommunityController.findOne(req, res))
      .then(() => {
        expect(res.ok).to.have.been.called()
        expect(res.body).to.deep.equal({
          id: community.id,
          name: community.get('name'),
          slug: community.get('slug'),
          avatar_url: null,
          banner_url: null,
          description: null,
          settings: {},
          location: null
        })
      })
    })
  })

  describe('.create', () => {
    var p1, p2
    before(() => {
      p1 = factories.post()
      p2 = factories.post()
      return Promise.join(
        Tag.createDefaultTags(),
        new Community({name: 'Scoby', slug: 'starter-posts'}).save()
        .then(c => Promise.join(
          p1.save().then(() => p1.communities().attach(c.id))
          .then(() => Tag.find('request'))
          .then(tag => p1.tags().attach({tag_id: tag.id, selected: true})),

          p2.save().then(() => p2.communities().attach(c.id))
          .then(() => Tag.find('offer'))
          .then(tag => p2.tags().attach({tag_id: tag.id, selected: true}))
        ))
      )
    })

    it('creates starter posts and default tags', () => {
      req.session.userId = user.id
      _.extend(req.params, {name: 'Bar', slug: 'bar'})

      return CommunityController.create(req, res)
      .then(() => Community.find('bar', {withRelated: [
        'users', 'memberships', 'leader', 'tags', 'posts', 'posts.selectedTags'
      ]}))
      .then(community => {
        expect(community).to.exist
        expect(community.get('name')).to.equal('Bar')
        expect(community.get('slug')).to.equal('bar')
        expect(community.relations.leader.id).to.equal(user.id)
        expect(community.relations.users.first().pivot.get('role')).to.equal(Membership.MODERATOR_ROLE)

        const tags = community.relations.tags
        expect(tags.length).to.equal(3)
        expect(tags.pluck('name').sort()).to.deep.equal(['intention', 'offer', 'request'])
        expect(tags.map(t => t.pivot.get('user_id'))).to.deep.equal(times(3, () => user.id))

        const posts = sortBy(community.relations.posts.models, p => p.get('created_at'))
        expect(posts.length).to.equal(2)
        expect(posts[0].get('name')).to.equal(p1.get('name'))
        expect(posts[0].relations.selectedTags.first().get('name')).to.equal('request')
        expect(posts[1].get('name')).to.equal(p2.get('name'))
        expect(posts[1].relations.selectedTags.first().get('name')).to.equal('offer')
      })
    })
  })

  describe('.validate', () => {
    it('rejects non-whitelisted columns', () => {
      req.params.column = 'foo'
      CommunityController.validate(req, res)
      .then(() => {
        expect(res.badRequest).to.have.been.called()
        expect(res.body).to.equal('invalid value "foo" for parameter "column"')
      })
    })

    it('requires a value', () => {
      req.params.column = 'name'
      CommunityController.validate(req, res)
      .then(() => {
        expect(res.badRequest).to.have.been.called()
        expect(res.body).to.equal('missing required parameter "value"')
      })
    })

    it('requires a constraint', () => {
      _.extend(req.params, {column: 'name', value: 'foo', constraint: 'foo'})
      CommunityController.validate(req, res)
      .then(() => {
        expect(res.badRequest).to.have.been.called()
        expect(res.body).to.equal('invalid value "foo" for parameter "constraint"')
      })
    })

    describe('with an existing value', () => {
      var community

      before(() => {
        community = factories.community()
        return community.save()
      })

      it('fails a uniqueness check', () => {
        _.extend(req.params, {column: 'name', value: community.get('name'), constraint: 'unique'})
        return CommunityController.validate(req, res)
        .then(() => {
          expect(res.ok).to.have.been.called()
          expect(res.body).to.deep.equal({unique: false})
        })
      })

      it('passes an existence check', () => {
        _.extend(req.params, {column: 'name', value: community.get('name'), constraint: 'exists'})
        return CommunityController.validate(req, res)
        .then(() => {
          expect(res.ok).to.have.been.called()
          expect(res.body).to.deep.equal({exists: true})
        })
      })
    })
  })

  describe('.joinWithCode', () => {
    var community
    beforeEach(() => {
      community = factories.community({beta_access_code: 'foo'})
      return community.save()
    })

    it('works', () => {
      req.params.code = 'foo'
      req.login(user.id)

      return CommunityController.joinWithCode(req, res)
      .tap(() => Promise.join(
        community.load(['posts', 'posts.relatedUsers']),
        user.load('communities')
      ))
      .then(() => {
        expect(user.relations.communities.map(c => c.id)).to.contain(community.id)
      })
    })
  })

  describe('.findForNetwork', () => {
    var network, fixtures
    before(() => {
      network = new Network({name: 'N1', slug: 'n1'})
      return network.save()
      .then(network => {
        return Promise.props({
          c1: new Community({name: 'NC1', slug: 'nc1', network_id: network.get('id')}).save(),
          c2: new Community({name: 'NC2', slug: 'nc2', network_id: network.get('id')}).save(),
          c3: new Community({name: 'NC3', slug: 'nc3'}).save(),
          n1: network
        })
        .then(props => fixtures = props)
      })
    })

    it('works with slug', () => {
      req.params.networkId = 'n1'
      req.login(user.id)
      return CommunityController.findForNetwork(req, res)
      .then(() => {
        expect(res.body.length).to.equal(2)
        expect(Number(res.body[0].memberCount)).to.equal(0)
        var slugs = res.body.map(c => c.slug)
        expect(!!_.includes(slugs, 'nc1')).to.equal(true)
        expect(!!_.includes(slugs, 'nc2')).to.equal(true)
        expect(!!_.includes(slugs, 'nc3')).to.equal(false)
      })
    })

    it('works with paginate', () => {
      req.params.networkId = 'n1'
      req.params.paginate = true
      req.params.offset = 1
      req.params.limit = 1
      req.login(user.id)
      return CommunityController.findForNetwork(req, res)
      .then(() => {
        expect(res.body.communities_total).to.equal('2')
        expect(res.body.communities.length).to.equal(1)
        expect(res.body.communities[0].slug).to.equal('nc2')
        expect(res.body.communities[0].id).to.equal(fixtures.c2.id)
        expect(Number(res.body.communities[0].memberCount)).to.equal(0)
      })
    })
  })

  describe('.updateMembership', () => {
    var community

    beforeEach(() => {
      community = factories.community()
      return community.save()
      .then(() => user.joinCommunity(community))
      .then(() => {
        req.params.communityId = community.id
        req.session.userId = user.id
      })
    })

    it('works', () => {
      req.params.settings = {send_email: true, send_push_notifications: false}

      return CommunityController.updateMembership(req, res)
      .then(() => Membership.where({user_id: user.id, community_id: community.id}).fetch())
      .then(membership => {
        expect(membership.get('settings')).to.deep.equal({send_email: true, send_push_notifications: false})
      })
    })
  })
})
