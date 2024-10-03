/* eslint-disable no-unused-expressions */
import { spyify, unspyify } from '../../setup/helpers'
import { sortBy } from 'lodash/fp'
const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('Invitation', function () {
  before(() => setup.clearDb())

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Invitation.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('#use', function () {
    let user, group, tag, invitation1, invitation2, inviter, cr

    before(async () => {
      inviter = await factories.user().save()
      user = await factories.user().save()
      group = await factories.group().save()
      tag = await new Tag({ name: 'taginvitationtest' }).save()
      invitation1 = await Invitation.create({
        userId: inviter.id,
        groupId: group.id,
        email: 'foo@comcom.com',
        moderator: true
      })
      invitation2 = await Invitation.create({
        userId: inviter.id,
        groupId: group.id,
        email: 'foo@comcom.com',
        moderator: true,
        tag_id: tag.id
      })
    })

    it('creates a membership and marks itself used', async () => {
      await bookshelf.transaction(trx => invitation1.use(user.id, { transacting: trx }))
      expect(invitation1.get('used_by_id')).to.equal(user.id)
      expect(invitation1.get('used_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      const hasAdministration = await GroupMembership.hasResponsibility(user, group, Responsibility.constants.RESP_ADMINISTRATION)
      expect(hasAdministration).to.be.true
    })

    it('creates a tag_follow when it has a tag_id', function () {
      return bookshelf.transaction(trx => invitation2.use(user.id, { transacting: trx }))
        .then(TagFollow.where({
          user_id: user.id,
          group_id: group.id,
          tag_id: tag.id
        }).fetch())
        .then(tagFollow => expect(tagFollow).to.exist)
    })
  })

  describe('.reinviteAll', () => {
    var group, c2, user, inviter
    before(() => {
      group = factories.group()
      c2 = factories.group()
      user = factories.user()
      inviter = factories.user()
      spyify(Email, 'sendInvitation', () => Promise.resolve({}))
      return Promise.join(inviter.save(), user.save(), group.save(), c2.save())
      .then(() => {
        return Promise.join(
          Invitation.create({
            groupId: group.id,
            userId: inviter.id,
            email: 'foo@bar.com'
          }),
          Invitation.create({
            groupId: group.id,
            userId: inviter.id,
            email: 'bar@baz.com'
          }),
          Invitation.create({
            groupId: c2.id,
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
        groupId: group.id
      })
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(2)
      })
    })
  })

  describe('createAndSend', () => {
    var group, user, inviter, invEmail, invData
    before(() => {
      group = factories.group()
      user = factories.user()
      inviter = factories.user()
      spyify(Email, 'sendInvitation', (email, data) => {
        invEmail = email
        invData = data
        return Promise.resolve({})
      })
      return Promise.join(inviter.save(), user.save(), group.save())
    })

    after(() => unspyify(Email, 'sendInvitation'))

    it('creates an invite and calls Email.sendInvitation', async () => {
      const subject = 'The invite subject'
      const message = 'The invite message'
      const email = 'foo@comcom.com'
      const invitation = await Invitation.create({
        userId: inviter.id,
        groupId: group.id,
        email,
        moderator: true,
        subject,
        message
      })
      // console.log('invitation in test', invitation)
      return Invitation.createAndSend({invitation})
      .then(() => Invitation.where({email: email, group_id: group.id}).fetch())
      .then(invitation => {
        expect(invitation).to.exist
        expect(invitation.get('subject')).to.equal(subject)
        expect(invitation.get('message')).to.equal(message)
      })
      .then(() => {
        expect(Email.sendInvitation).to.have.been.called.exactly(1)
        expect(invEmail).to.equal(email)
        expect(invData).to.contain({
          subject,
          message,
          inviter_name: inviter.get('name'),
          inviter_email: inviter.get('email'),
          group_name: group.get('name')
        })
      })
    })
  })

  describe('.resendAllReady', () => {
    var group, c2, inviter, user
    before(() => {
      group = factories.group()
      c2 = factories.group()
      inviter = factories.user()
      user = factories.user()
      const day = 1000 * 60 * 60 * 24
      const now = new Date()
      return Promise.join(inviter.save(), group.save(), c2.save(), user.save())
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
          Invitation.create({groupId: group.id, userId, email})
          .then(i => i.save({sent_count, last_sent_at, used_by_id}, {patch: true})))
      })
    })

    it('sends the invitations that are ready and unused', function () {
      this.timeout(10000)
      const now = new Date().getTime()

      return Invitation.resendAllReady()
      .then(() => Invitation.where({group_id: group.id}).fetchAll())
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
