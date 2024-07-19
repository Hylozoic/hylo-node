require(require('root-path')('test/setup'));

describe('PlayCrypto', function() {

  it('is reversible', function() {
    expect(PlayCrypto.decrypt(PlayCrypto.encrypt('foobarbaz'))).to.equal('foobarbaz');
  });

})