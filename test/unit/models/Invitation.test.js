var setup = require(require('root-path')('test/setup'))

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
      .tap(i => invitation1 = i)
      .then(() => Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true,
        tag_id: tag.id
      }))
      .tap(i => invitation2 = i)
    })

    it('creates a membership and marks itself used', function () {
      return bookshelf.transaction(trx => invitation1.use(user.id, {transacting: trx}))
      .then(() => {
        expect(invitation1.get('used_by_id')).to.equal(user.id)
        expect(invitation1.get('used_on').getTime()).to.be.closeTo(new Date().getTime(), 2000)

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
})
