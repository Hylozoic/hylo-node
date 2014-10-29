var root = require('root-path');
var PlaySession = require(root('api/services/PlaySession'));
var expect = require('chai').expect;

describe('PlaySession', function() {
  describe('#isValid', function() {
    var request = {
      headers: {
        cookie: 'lol=lol; PLAY_SESSION="6cb3b755aebf3bec7d792aa23e2d7651b55d0cba-pa.u.exp=1415742115467&pa.p.id=password&pa.u.id=l%40lw.io"; other=morelols'
      }
    };

    it('is false when there is no cookie', function() {
      expect(new PlaySession({}).isValid()).to.be.false;
    });

    it('is false when the cookie signature does not match', function() {
      expect(new PlaySession(request, {secret: 'iamabadsecret'}).isValid()).to.be.false;
    });

    it('is true when the cookie signature matches', function() {
      expect(new PlaySession(request, {secret: 'iamasecret'}).isValid()).to.be.true;
    });
  })
})