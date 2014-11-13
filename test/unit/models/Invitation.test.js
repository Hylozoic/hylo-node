var setup = require(require('root-path')('test/setup'));

describe('Invitation', function() {

  before(function(done) {
    setup.initDb(done);
  });

  describe("#create", function() {

    it('generates a valid uuid', function(done) {
      Invitation.create({id: 1}, 'foo@bar.org', {id: 2}).then(function(invitation) {
        var uuidPattern = /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/;
        expect(invitation.get('token')).to.match(uuidPattern);
      }).then(done);
    });

  });

})