/* globals InvitationService */
import { markdown } from 'hylo-utils/text'
var root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const { mockify } = require(root('test/setup/helpers'))

describe('InvitationService', () => {
  var community, inviter

  before(() => {
    inviter = factories.user()
    community = factories.community()
    return Promise.join(inviter.save(), community.save())
  })

  describe('create', () => {
    let queuedCalls = []
    const subject = 'Join us'
    const message = "You'll like it. It's safe."

    before(() => {
      mockify(Queue, 'classMethod', (cls, method, opts) =>
        Promise.resolve(queuedCalls.push([cls, method, opts])))
    })

    it('rejects invalid emails and sends to the rest', () => {
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
          {email: 'foo@foo.com'},
          {email: 'bar@bar.com'}
        ])

        expect(Queue.classMethod).to.have.been.called.exactly(2)
        expect(queuedCalls).to.deep.equal([
          [
            'Invitation',
            'createAndSend',
            {
              email: 'foo@foo.com',
              userId: inviter.id,
              communityId: community.id,
              message: markdown(message),
              subject,
              moderator: false
            }
          ],
          [
            'Invitation',
            'createAndSend',
            {
              email: 'bar@bar.com',
              userId: inviter.id,
              communityId: community.id,
              message: markdown(message),
              subject,
              moderator: false
            }
          ]
        ])
      })
    })
  })
})
