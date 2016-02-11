var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var Promise = require('bluebird')
var checkAndSetMembership = Promise.promisify(require(require('root-path')('api/policies/checkAndSetMembership')))
var CommunityController = require(root('api/controllers/CommunityController'))

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
    it('works', () => {
      req.session.userId = user.id
      _.extend(req.params, {name: 'Bar', slug: 'bar'})

      return CommunityController.create(req, res)
      .then(() => Community.find('bar', {withRelated: ['users', 'memberships', 'leader']}))
      .then(community => {
        expect(community).to.exist
        expect(community.get('name')).to.equal('Bar')
        expect(community.get('slug')).to.equal('bar')
        expect(community.relations.leader.id).to.equal(user.id)
        expect(community.relations.users.first().pivot.get('role')).to.equal(Membership.MODERATOR_ROLE)
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
        var welcome = community.relations.posts.find(p => p.get('type') === 'welcome')
        expect(welcome).to.exist
        var relatedUser = welcome.relations.relatedUsers.first()
        expect(relatedUser).to.exist
        expect(relatedUser.id).to.equal(user.id)
        expect(user.relations.communities.map(c => c.id)).to.contain(community.id)
      })
    })
  })
})
