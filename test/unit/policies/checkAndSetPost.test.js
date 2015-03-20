var setup = require(require('root-path')('test/setup'));
var checkAndSetPost = require(require('root-path')('api/policies/checkAndSetPost'));
describe('checkAndSetPost', function() {
  var fixtures, req, res, next;

  before(function(done) {
    setup.initDb(function() {
      Promise.props({
        u1: new User({name: 'U1'}).save(),
        c1: new Community({name: "C1"}).save(),
        c2: new Community({name: "C2"}).save(),
        p1: new Post({name: "P1"}).save(),
        p2: new Post({name: "P2"}).save()
      }).then(function(props) {
        fixtures = props;
        return Promise.props({
          pc1: props.c1.posts().attach(props.p1.id),
          pc2: props.c2.posts().attach(props.p2.id),
          m1: new Membership({community_id: props.c1.id, users_id: props.u1.id}).save()
        });
      }).then(function(props) {
        fixtures.m1 = props.m1;
        done();
      });
    });
  });

  after(function(done) {
    setup.clearDb(done);
  });

  describe('#user', function() {
    before(function() {
      req = {
        session: {userId: fixtures.u1.id}
      };
    });

    beforeEach(function() {
      next = spy();
    });

    it('is not allowed access given a null postId request param', function(done) {
      req.param = function(name) {
        if (name == 'postId') return null;
      };

      res = {
        locals: {},
        forbidden: spy(function() {})
      };

      checkAndSetPost(req, res, next)
        .then(function() {
          expect(res.forbidden).to.have.been.called();
          done();
        })
        .catch(done);
    });

    it('is allowed to view posts in their community', function(done) {
      req.param = function(name) {
        if (name == 'postId') return fixtures.p1.id;
      };

      res = {
        locals: {},
        forbidden: spy(function() {})
      };

      checkAndSetPost(req, res, next)
      .then(function() {
        expect(next).to.have.been.called();
        done();
      })
      .catch(done);
    });

    it('is not allowed to view post not within their communities', function(done) {
      req.param = function(name) {
        if (name == 'postId') return fixtures.p2.id;
      };

      res = {
        locals: {},
        forbidden: spy(function() {})
      };

      checkAndSetPost(req, res, next)
        .then(function() {
          expect(next).to.not.have.been.called();
          expect(res.forbidden).to.have.been.called();
          done();
        })
        .catch(done);
    });
  });

});
