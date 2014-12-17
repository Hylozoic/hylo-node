require(require('root-path')('test/setup'));
var Email = requireFromRoot('api/services/Email');

describe('Email', function() {

  describe('.sendInvitation', function() {

    it('makes a successful request to SendWithUs', function(done) {

      Email.sendInvitation('foo@bar.com', {}, function(err, result) {
        if (err) return done(err);
        expect(result.success).to.be.true;
        done();
      });

    });

  });

});
