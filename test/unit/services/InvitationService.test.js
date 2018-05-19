import { markdown } from 'hylo-utils/text'
var root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const { mockify } = require(root('test/setup/helpers'))
var InvitationService = require(root('api/services/InvitationService'))

describe('InvitationService', () => {
  var community, inviter, invitee, invitation

  before(() => {
    inviter = factories.user()
    invitee = factories.user()
    community = factories.community()
    return Promise.join(inviter.save(), invitee.save(), community.save())
  })

  describe('check', () => {
    before(() => {
      invitation = factories.invitation()
      return invitation.save({
        invited_by_id: inviter.id,
        community_id: community.id
      })
    })

    it('should find a community by a valid accessCode', () => {
      return InvitationService.check(invitee.get('id'), null, community.get('beta_access_code'))
      .then(result =>
        expect(result.valid).to.equal(true)
      )
    })

    it('should find a community by a valid token', () => {
      const userId = invitee.get('id')
      const token = invitation.get('token')
      return InvitationService.check(userId, token, null)
      .then(result =>
        expect(result.valid).to.equal(true)
      )
    })

    it('should find a community by accessCode if both an accessCode and token are provided', () => {
      const userId = invitee.get('id')
      const accessCode = community.get('beta_access_code')
      const token = 'INVALIDTOKEN'
      InvitationService.check(userId, token, accessCode).then(result =>
        expect(result.valid).to.equal(true)
      )
    })
  })

  describe('use', () => {
    before(() => {
      invitation = factories.invitation()
      return invitation.save({
        invited_by_id: inviter.get('id'),
        community_id: community.get('id')
      })
    })

    it('should join the invitee to community if beta_access_code is valid', () => {
      const accessCode = community.get('beta_access_code')
      return InvitationService.use(invitee.get('id'), null, accessCode)
      .then(membership =>
        expect(membership.attributes).to.contain({
          user_id: invitee.get('id'),
          active: true
        })
      )
    })

    it('should join the invitee to community if token is valid', () => {
      const userId = invitee.get('id')
      const token = invitation.get('token')
      return InvitationService.use(userId, token, null)
      .then(membership =>
        expect(membership.attributes).to.contain({
          user_id: invitee.get('id'),
          active: true
        })
      )
    })

    it('should join the invitee to community by accessCode if both an accessCode and token are provided', () => {
      const userId = invitee.get('id')
      const token = invitation.get('token')
      const accessCode = community.get('beta_access_code')
      return InvitationService.use(userId, token, accessCode)
      .then(membership => {
        return invitation.refresh()
        .then(updatedInvitation => {
          expect(updatedInvitation.get('used_by_id')).to.equal(invitee.get('id'))
          return expect(membership.attributes).to.contain({
            user_id: invitee.get('id'),
            active: true
          })
        })
      })
    })
  })

  describe('create', () => {
    let queuedCalls = []
    const subject = 'Join us'
    const message = "You'll like it. It's safe."

    before(() => {
      mockify(Queue, 'classMethod', (cls, method, opts) =>
        Promise.resolve(queuedCalls.push([cls, method, opts])))
    })

    it.skip('rejects invalid emails and sends to the rest', () => {
      return InvitationService.create({
        sessionUserId: inviter.id,
        communityId: community.id,
        emails: ['foo', 'bar', 'foo@foo.com', 'bar@bar.com'],
        subject,
        message
      })
      .then(results => {
        expect(results).to.deep.equal([
          {email: 'foo', error: 'not a valid email address'},
          {email: 'bar', error: 'not a valid email address'},
          {email: 'foo@foo.com', lastSentAt: undefined, createdAt: undefined, id: results[2].id},
          {email: 'bar@bar.com', lastSentAt: undefined, createdAt: undefined, id: results[3].id}
        ])

        expect(Queue.classMethod).to.have.been.called.exactly(2)
        const firstInvitation = queuedCalls[0][2].invitation
        const secondInvitation = queuedCalls[1][2].invitation
        expect(queuedCalls).to.deep.equal([
          [
            'Invitation',
            'createAndSend',
            {
              invitation: firstInvitation
            }
          ],
          [
            'Invitation',
            'createAndSend',
            {
              invitation: secondInvitation
            }
          ]
        ])
      })
    })
  })
})
