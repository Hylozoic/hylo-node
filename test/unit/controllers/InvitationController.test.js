var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var InvitationController = require(root('api/controllers/InvitationController'))
import { mockify, spyify, unspyify } from '../../setup/helpers'
import { map, sortBy, find } from 'lodash/fp'

describe('InvitationController', () => {
  var user, community, invitation, inviter, req, res

  before(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    user = factories.user()
    inviter = factories.user()
  })

  describe('.use', () => {
    before(() => {
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
    var community, u1, u2, sendInvitationResults

    before(() => {
      community = factories.community()
      u1 = factories.user()
      u2 = factories.user()
      inviter = factories.user()
      return Promise.join(
        community.save(),
        u1.save(),
        u2.save(),
        inviter.save())
    })

    beforeEach(() => {
      req.session.userId = inviter.id
      sendInvitationResults = []
      spyify(Email, 'sendInvitation', (...args) =>
        sendInvitationResults.push(args.slice(-1)[0]))
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

    it('sends invitations to emails and users', function () {
      this.timeout(10000)
      _.extend(req.params, {
        communityId: community.id,
        emails: 'foo@bar.com, bar@baz.com',
        users: [u1.id, u2.id]
      })

      return InvitationController.create(req, res)
      .then(() => {
        expect(res.body.results).to.have.length(4)
        // res.body.results.forEach(result => {
        //   expect(result).to.have.property('error', null)
        // })

        // expect(Email.sendInvitation).to.have.been.called.exactly(4)
        // return expect(Promise.all(sendInvitationResults).then(map('success')))
        // .to.eventually.deep.equal([true, true, true, true])
      })
    })

    // it('returns error message if mail sending fails', () => {
    //   mockify(Email, 'sendInvitation', () => new Promise((res, rej) => rej({message: 'failed'})))
    //   _.extend(req.params, {communityId: community.id, emails: 'foo@bar.com, bar@baz.com', users: []})
    //
    //   return InvitationController.create(req, res)
    //   .then(() => {
    //     expect(res.body).to.deep.equal({
    //       results: [
    //         {email: 'foo@bar.com', error: 'failed'},
    //         {email: 'bar@baz.com', error: 'failed'}
    //       ]
    //     })
    //
    //     expect(Email.sendInvitation).to.have.been.called.exactly(2)
    //   })
    // })
  })

  describe('.find', () => {
    var u1, u2
    before(() => {
      community = factories.community()
      const c2 = factories.community()
      u1 = factories.user()
      u2 = factories.user()
      const u3 = factories.user()
      return Promise.map([community, c2, u1, u2, u3, inviter], x => x.save())
      .then(() => Promise.map([[u1, community], [u2, community], [u2, c2], [u3, c2]], ([u, c]) =>
        Invitation.create({
          communityId: c.id,
          userId: inviter.id,
          email: u.get('email')
        })))
      .then(() => Promise.map([[u1, community], [u2, c2], [u3, c2]], ([u, c]) =>
        u.joinCommunity(c)))
      .then(() => {
        req.params.communityId = community.id
      })
    })

    it('returns invitations for the community, returning only users that are in this community', () => {
      return InvitationController.find(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        expect(res.body.total).to.equal(2)
        const u1Invite = find(i => i.email === u1.get('email'), res.body.items)
        expect(u1Invite).to.exist
        expect(u1Invite.user).to.exist
        const u2Invite = find(i => i.email === u2.get('email'), res.body.items)
        expect(u2Invite).to.exist
        expect(u2Invite.user).to.not.exist
      })
    })
  })
})
