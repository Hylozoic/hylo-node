var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var InvitationController = require(root('api/controllers/InvitationController'))
import { mockify, unspyify } from '../../setup/helpers'

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

    it('adds the user to the community', () => {
      return InvitationController.use(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        return user.load(['communities'])
      })
      .then(() => {
        expect(user.relations.communities.first().id).to.equal(community.id)
      })
    })
  })

  describe('.create', () => {
    var community

    before(() => {
      community = factories.community()
      return community.save()
    })

    beforeEach(() => {
      req.session.userId = user.id
      mockify(Email, 'sendInvitation', () => new Promise((res, rej) => res()))
    })

    afterEach(() => unspyify(Email, 'sendInvitation'))

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

    it('sends invitations', () => {
      _.extend(req.params, {communityId: community.id, emails: 'foo@bar.com, bar@baz.com'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(2)

        expect(res.body).to.deep.equal({
          results: [
            {email: 'foo@bar.com', error: null},
            {email: 'bar@baz.com', error: null}
          ]
        })
      })
    })

    it('returns error message if mail sending fails', () => {
      mockify(Email, 'sendInvitation', () => new Promise((res, rej) => rej({message: 'failed'})))
      _.extend(req.params, {communityId: community.id, emails: 'foo@bar.com, bar@baz.com'})

      return InvitationController.create(req, res)
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(2)

        expect(res.body).to.deep.equal({
          results: [
            {email: 'foo@bar.com', error: 'failed'},
            {email: 'bar@baz.com', error: 'failed'}
          ]
        })
      })
    })
  })
})
