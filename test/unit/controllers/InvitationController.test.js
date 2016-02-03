var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var InvitationController = require(root('api/controllers/InvitationController'))

describe('InvitationController', () => {
  var user, community, invitation, inviter, req, res

  before(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('.use', () => {
    before(() => {
      user = factories.user()
      inviter = factories.user()
      community = factories.community()
      return Promise.join(inviter.save(), user.save(), community.save())
      .then(() => {
        req.login(user.id)

        return Invitation.create({
          communityId: community.id,
          userId: inviter.id,
          email: 'foo@bar.com'
        }).tap(i => {
          invitation = i
          req.params.token = invitation.get('token')
        })
      })
    })

    it('adds the user to the community and creates a welcome post', () => {
      return InvitationController.use(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        return user.load(['followedPosts', 'followedPosts.relatedUsers', 'communities'])
      })
      .then(() => {
        expect(user.relations.communities.first().id).to.equal(community.id)
        var post = user.relations.followedPosts.first()
        expect(post).to.exist
        expect(post.get('type')).to.equal('welcome')
        var relatedUser = post.relations.relatedUsers.first()
        expect(relatedUser.id).to.equal(user.id)
      })
    })
  })

  describe('.create', () => {
    var community

    before(() => {
      Invitation.createAndSend = spy(Invitation.createAndSend)
      community = factories.community()
      return community.save()
    })

    beforeEach(() => {
      req.session.userId = user.id
    })

    it('rejects invalid email', () => {
      _.extend(req.params, {communityId: community.id, emails: 'wow, lol'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(res.body).to.deep.equal({
          results: [
            {email: 'wow', error: 'not a valid email address'},
            {email: 'lol', error: 'not a valid email address'}
          ]
        })
      })
    })

    it('works', function () {
      this.timeout(5000)
      _.extend(req.params, {communityId: community.id, emails: 'foo@bar.com, bar@baz.com'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(res.body).to.deep.equal({
          results: [
            {email: 'foo@bar.com', error: null},
            {email: 'bar@baz.com', error: null}
          ]
        })
      })
    })
  })
})
