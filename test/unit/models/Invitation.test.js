var setup = require(require('root-path')('test/setup'));

describe('Invitation', function() {

  before(() => setup.clearDb());

  describe('#use', function() {

    var user, community, invitation, inviter;

    before(() => {
      inviter = new User({email: 'inviter@bar.com'});
      user = new User({email: 'foo@bar.com'});
      community = new Community({name: 'foo', slug: 'foo'});
      return Promise.join(
        user.save(),
        inviter.save(),
        community.save()
      )
      .then(() => Invitation.create({
        userId: inviter.id,
        communityId: community.id,
        email: 'foo@comcom.com',
        moderator: true
      }))
      .tap(i => invitation = i);
    });

    it('creates a membership and marks itself used', function() {
      return bookshelf.transaction(trx => invitation.use(user.id, {transacting: trx}))
      .then(() => {
        expect(invitation.get('used_by_id')).to.equal(user.id);
        expect(invitation.get('used_on').getTime()).to.be.closeTo(new Date().getTime(), 2000);

        return Membership.hasModeratorRole(user.id, community.id);
      })
      .then(isModerator => expect(isModerator).to.be.true);
    });
  });

});
