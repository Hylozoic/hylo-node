var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var InvitationController = require(root('api/controllers/InvitationController'))

describe('InvitationController', () => {
  describe('.use', () => {
    var user, community, invitation, inviter, req, res

    before(() => {
      req = factories.mock.request()
      res = factories.mock.response()
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
})
