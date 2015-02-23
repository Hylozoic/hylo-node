var setup = require(require('root-path')('test/setup'));

describe('Invitation', function() {

  before(function(done) {
    setup.initDb(done);
  });

  after(function(done) {
    setup.clearDb(done);
  });

  describe("#create", function() {

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

})