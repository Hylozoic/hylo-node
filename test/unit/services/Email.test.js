require(require('root-path')('test/setup'));

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

  describe('.postReplyAddress', function() {

    // this expects dev environment variables:
    // MAILGUN_EMAIL_SALT=FX988194AD22EE636
    // MAILGUN_DOMAIN=mg.hylo.com
    // PLAY_APP_SECRET=5qX69G/e3ZJ29qIeaEpJKQuJYr3MHOe52EFmRNGVOqfW8VAxUwSKUg
    it('encrypts the post and user ids', function() {
      var postId = 7823, userId = 5942,
        expected = 'reply-7152e5d64e5fd9e75e6108c1e9356ef418b81bb1a3f77f32cbf42b11c7d50e0e@mg.hylo.com';

      expect(Email.postReplyAddress(postId, userId)).to.equal(expected);
    })

  });

  describe('.decodePostReplyAddress', function() {
    it('works with human-readable formats', function() {
      var address = '"reply-7152e5d64e5fd9e75e6108c1e9356ef418b81bb1a3f77f32cbf42b11c7d50e0e@mg.hylo.com" <reply-7152e5d64e5fd9e75e6108c1e9356ef418b81bb1a3f77f32cbf42b11c7d50e0e@mg.hylo.com>';

      expect(Email.decodePostReplyAddress(address)).to.deep.equal({postId: '7823', userId: '5942'});
    })
  })

});
