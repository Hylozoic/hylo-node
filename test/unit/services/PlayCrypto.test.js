require(require('root-path')('test/setup'));
var PlayCrypto = requireFromRoot('api/services/PlayCrypto');

describe('PlayCrypto', function() {

  it('is reversible', function() {
    expect(PlayCrypto.decrypt(PlayCrypto.encrypt('foobarbaz'))).to.equal('foobarbaz');
  });

})