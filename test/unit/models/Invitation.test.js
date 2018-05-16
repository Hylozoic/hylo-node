/* eslint-disable no-unused-expressions */
import { spyify, unspyify } from '../../setup/helpers'
import { sortBy } from 'lodash/fp'
var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Invitation', function () {
  before(() => setup.clearDb())

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Invitation.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('#use', function () {
    var user, community, tag, invitation1, invitation2, inviter

    before(async () => {
      inviter = await factories.user().save()
      user = await factories.user().save()
      community = await factories.community().save()
      tag = await new Tag({name: 'taginvitationtest'}).save()
      invitation1 = await Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true
      })
      invitation2 = await Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true,
        tag_id: tag.id
      })
    })

    it('creates a membership and marks itself used', async () => {
      await bookshelf.transaction(trx => invitation1.use(user.id, {transacting: trx}))
      expect(invitation1.get('used_by_id')).to.equal(user.id)
      expect(invitation1.get('used_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      const isModerator = await GroupMembership.hasModeratorRole(user, community)
      expect(isModerator).to.be.true
    })

    it('creates a tag_follow when it has a tag_id', function () {
      return bookshelf.transaction(trx => invitation2.use(user.id, {transacting: trx}))
      .then(TagFollow.where({
        user_id: user.id,
        community_id: community.id,
        tag_id: tag.id
      }).fetch())
      .then(tagFollow => expect(tagFollow).to.exist)
    })
  })

  describe('.reinviteAll', () => {
    var community, c2, user, inviter
    before(() => {
      community = factories.community()
      c2 = factories.community()
      user = factories.user()
      inviter = factories.user()
      spyify(Email, 'sendInvitation', () => Promise.resolve({}))
      return Promise.join(inviter.save(), user.save(), community.save(), c2.save())
      .then(() => {
        return Promise.join(
          Invitation.create({
            communityId: community.id,
            userId: inviter.id,
            email: 'foo@bar.com'
          }),
          Invitation.create({
            communityId: community.id,
            userId: inviter.id,
            email: 'bar@baz.com'
          }),
          Invitation.create({
            communityId: c2.id,
            userId: inviter.id,
            email: 'baz@foo.com'
          })
        )
      })
    })

    after(() => unspyify(Email, 'sendInvitation'))

    it('calls Email.sendInvitation twice', () => {
      return Invitation.reinviteAll({
        userId: inviter.id,
        communityId: community.id
      })
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(2)
      })
    })
  })

  describe('createAndSend', () => {
    var community, user, inviter, invEmail, invData
    before(() => {
      community = factories.community()
      user = factories.user()
      inviter = factories.user()
      spyify(Email, 'sendInvitation', (email, data) => {
        invEmail = email
        invData = data
        return Promise.resolve({})
      })
      return Promise.join(inviter.save(), user.save(), community.save())
    })

    after(() => unspyify(Email, 'sendInvitation'))

    it.skip('creates an invite and calls Email.sendInvitation', () => {
      const subject = 'The invite subject'
      const message = 'The invite message'

      const opts = {
        userId: inviter.id,
        communityId: community.id,
        email: user.get('email'),
        subject,
        message
      }
      return Invitation.createAndSend(opts)
      .then(() => Invitation.where({email: user.get('email'), community_id: community.id}).fetch())
      .then(invitation => {
        expect(invitation).to.exist
        expect(invitation.get('subject')).to.equal(subject)
        expect(invitation.get('message')).to.equal(message)
      })
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(1)
        expect(invEmail).to.equal(user.get('email'))
        expect(invData).to.contain({
          subject,
          message,
          inviter_name: inviter.get('name'),
          inviter_email: inviter.get('email'),
          community_name: community.get('name')
        })
      })
    })
  })

  describe('.resendAllReady', () => {
    var community, c2, inviter, user
    before(() => {
      community = factories.community()
      c2 = factories.community()
      inviter = factories.user()
      user = factories.user()
      const day = 1000 * 60 * 60 * 24
      const now = new Date()
      return Promise.join(inviter.save(), community.save(), c2.save(), user.save())
      .then(() => {
        const attributes = [
          {
            email: 'a@sendme.com',
            sent_count: 1,
            last_sent_at: new Date(now - 4.1 * day)
          },
          {
            email: 'b@sendme.com',
            sent_count: 2,
            last_sent_at: new Date(now - 9.1 * day)
          },
          {
            email: 'a@used.com',
            sent_count: 1,
            last_sent_at: new Date(now - 10 * day),
            used_by_id: user.id
          },
          {
            email: 'a@notyet.com',
            sent_count: 1,
            last_sent_at: new Date(now - 3 * day)
          },
          {
            email: 'b@notyet.com',
            sent_count: 2,
            last_sent_at: new Date(now - 8 * day)
          }
        ]

        const userId = inviter.id
        return Promise.map(attributes, ({ email, sent_count, last_sent_at, used_by_id }) =>
          Invitation.create({communityId: community.id, userId, email})
          .then(i => i.save({sent_count, last_sent_at, used_by_id}, {patch: true})))
      })
    })

    it('sends the invitations that are ready and unused', function () {
      this.timeout(10000)
      const now = new Date().getTime()

      return Invitation.resendAllReady()
      .then(() => Invitation.where({community_id: community.id}).fetchAll())
      .then(invitations => {
        const expected = sortBy('email', [
          {
            email: 'a@sendme.com',
            sent_count: 2
          },
          {
            email: 'b@sendme.com',
            sent_count: 3
          },
          {
            email: 'a@used.com',
            sent_count: 1
          },
          {
            email: 'a@notyet.com',
            sent_count: 1
          },
          {
            email: 'b@notyet.com',
            sent_count: 2
          }
        ])

        expect(sortBy('email', invitations.map(i => ({
          email: i.get('email'),
          sent_count: i.get('sent_count')
        })))).to.deep.equal(expected)

        invitations.forEach(i => {
          const email = i.get('email')
          const lastSentAt = i.get('last_sent_at').getTime()
          if (email.match('@sendme.com')) {
            expect(lastSentAt).to.be.closeTo(now, 2000)
          } else {
            expect(lastSentAt).not.to.be.closeTo(now, 2000)
          }
        })
      })
    })
  })
})
