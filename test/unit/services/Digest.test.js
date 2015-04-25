var root = require('root-path'),
  setup = require(root('test/setup')),
  Digest = require(root('lib/community/digest')),
  moment = require('moment');

describe('Digest', function() {
  var community;

  before(function(done) {
    community = new Community({name: 'foo', slug: 'foo'});
    community.save().exec(done);
  });

  describe('.fetchData', function() {
    it("doesn't throw errors", function() {
      var digest = new Digest(community, moment(), moment().subtract(1, 'week'));
      return digest.fetchData();
    });
  });


});