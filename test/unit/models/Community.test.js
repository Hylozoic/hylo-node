var setup = require(require('root-path')('test/setup'));

describe('Community', function() {

  it('can be created', function(done) {
    var community = new Community({slug: 'foo', name: 'foo', beta_access_code: 'foo!'});
    community.save().then(function() {
      expect(community.id).to.exist;
      done();
    })
    .catch(done);
  });

});