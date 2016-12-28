var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import { spyify, unspyify } from '../../setup/helpers'

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
})
