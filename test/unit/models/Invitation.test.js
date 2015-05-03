var setup = require(require('root-path')('test/setup'));

describe('Invitation', function() {

  before(setup.resetDb);

  describe(".create", function() {

    it('generates a valid uuid', function(done) {
      Invitation.create({
        user: {id: 1},
        email: 'foo@bar.org',
        community: {id: 2}
      }).then(function(invitation) {
        var uuidPattern = /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/;
        expect(invitation.get('token')).to.match(uuidPattern);
      }).exec(done);
    });

  });

  describe('#use', function() {

    var user, community, invitation;

    before(function(done) {
      user = new User({});
      community = new Community({name: 'foo', slug: 'foo'});
      return Promise.join(
        user.save(),
        community.save()
      ).then(function() {
        invitation = new Invitation({community_id: community.id, role: Membership.MODERATOR_ROLE});
        return invitation.save();
      }).then(function() {
        done();
      });
    });

    it('creates a membership and marks itself used', function() {
      return bookshelf.transaction(function(trx) {
        return invitation.use(user.id, {transacting: trx});
      })
      .then(function() {
        expect(invitation.get('used_by_id')).to.equal(user.id);
        expect(invitation.get('used_on').getTime()).to.be.closeTo(new Date().getTime(), 2000);

        return Membership.hasModeratorRole(user.id, community.id);
      })
      .then(function(isModerator) {
        expect(isModerator).to.be.true;
      });
    });

  })

});
