require(require('root-path')('test/setup'));
var Email = requireFromRoot('api/services/Email');

describe('Email', function() {

  describe('.sendInvitation', function() {

    it('makes a successful request to SendWithUs', function(done) {
      this.timeout(5000);

      Email.sendInvitation('foo@bar.com', {})
      .then(function(result) {
        expect(result.success).to.be.true;
        done();
      })
      .catch(done);

    });

  });

});
