var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import { spyify, unspyify } from '../../setup/helpers'
import { sortBy } from 'lodash/fp'

describe('Invitation', function () {
  before(() => setup.clearDb())

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Invitation.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('#use', function () {
    var user, community, tag, invitation1, invitation2, inviter

    before(() => {
      inviter = new User({email: 'inviter@bar.com'})
      user = new User({email: 'foo@bar.com'})
      community = new Community({name: 'foo', slug: 'foo'})
      tag = new Tag({name: 'taginvitationtest'})
      return Promise.join(
        user.save(),
        inviter.save(),
        community.save(),
        tag.save()
      )
      .then(() => Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true
      }))
      .tap(i => {
        invitation1 = i
      })
      .then(() => Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true,
        tag_id: tag.id
      }))
      .tap(i => {
        invitation2 = i
      })
    })

    it('creates a membership and marks itself used', function () {
      return bookshelf.transaction(trx => invitation1.use(user.id, {transacting: trx}))
      .then(() => {
        expect(invitation1.get('used_by_id')).to.equal(user.id)
        expect(invitation1.get('used_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)

        return Membership.hasModeratorRole(user.id, community.id)
      })
      .then(isModerator => expect(isModerator).to.be.true)
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

    it('creates an invite and calls Email.sendInvitation', () => {
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
    var community, c2, inviter
    before(() => {
      community = factories.community()
      c2 = factories.community()
      inviter = factories.user()
      const day = 1000 * 60 * 60 * 24
      return Promise.join(inviter.save(), community.save(), c2.save())
      .then(() => {
        const attributes = [
          {
            email: 'a@a.com',
            sent_count: 1,
            last_sent_at: new Date((Date.now() + 1) - day)
          },
          {
            email: 'b@a.com',
            sent_count: 2,
            last_sent_at: new Date((Date.now() + 1) - day)
          },
          {
            email: 'c@a.com',
            sent_count: 3,
            last_sent_at: new Date((Date.now() + 1) - (4 * day))
          },
          {
            email: 'd@a.com',
            sent_count: 4,
            last_sent_at: new Date((Date.now() + 1) - (9 * day))
          },
          {
            email: 'a@b.com',
            sent_count: 1,
            last_sent_at: new Date(Date.now() + 1)
          },
          {
            email: 'b@b.com',
            sent_count: 2,
            last_sent_at: new Date(Date.now() + 1)
          },
          {
            email: 'c@b.com',
            sent_count: 3,
            last_sent_at: new Date((Date.now() + 1) - (3 * day))
          },
          {
            email: 'd@b.com',
            sent_count: 4,
            last_sent_at: new Date((Date.now() + 1) - (8 * day))
          }
        ]

        return Promise.map(attributes, ({ email, sent_count, last_sent_at }) =>
          Invitation.create({
            communityId: community.id,
            userId: inviter.id,
            email
          })
          .then(i => i.save({sent_count, last_sent_at}, {patch: true})))
      })
    })

    it('sends the invitations that are ready', () => {
      return Invitation.resendAllReady()
      .then(() => Invitation.where({community_id: community.id}).fetchAll())
      .then(invitations => {
        const expected = sortBy('email', [
          {
            email: 'a@a.com',
            sent_count: 2
          },
          {
            email: 'b@a.com',
            sent_count: 3
          },
          {
            email: 'c@a.com',
            sent_count: 4
          },
          {
            email: 'd@a.com',
            sent_count: 5
          },
          {
            email: 'a@b.com',
            sent_count: 1
          },
          {
            email: 'b@b.com',
            sent_count: 2
          },
          {
            email: 'c@b.com',
            sent_count: 3
          },
          {
            email: 'd@b.com',
            sent_count: 4
          }
        ])

        expect(sortBy('email', invitations.map(i => ({
          email: i.get('email'),
          sent_count: i.get('sent_count')
        })))).to.deep.equal(expected)

        invitations.forEach(i => {
          if (i.get('email').match('@a.com')) {
            expect(i.get('last_sent_at').getTime()).to.be.closeTo(new Date().getTime(), 1000)
          }
        })
      })
    })
  })
})
