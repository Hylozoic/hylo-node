var setup = require(require('root-path')('test/setup')),
  Promise = require("bluebird"),
  CommentController = requireFromRoot('api/controllers/CommentController');

describe('CommentController', function() {
  var fixtures, req, res;

  before(function(done) {
    setup.initDb(function() {
      return Promise.props({
        u1: new User({name: 'U1'}).save(),
        u2: new User({name: 'U2'}).save(),
        p1: new Post({name: 'P1'}).save(),
        c1: new Community({name: "C1"}).save()
      }).then(function(props) {
        fixtures = props;

        req = {
          allParams: function() {
            return this.params;
          },
          session: {userId: fixtures.u1.id}
        };

        res = {serverError: done};

        done();
      });
    });
  });

  after(function(done) {
    setup.clearDb(done);
  });

  describe('#create', function() {

    it('creates a comment', function(done) {
      req.params = {
        text: "<p>Hey <a data-user-id='" + fixtures.u2.id + "'>U2</a>, you're mentioned ;)</p>"
      };

      res.locals = {
        post: fixtures.p1
      };

      res.ok = function(data) {
        expect(data).to.exist;
        expect(data.user).to.exist;
        expect(data.text).to.equal("<p>Hey <a data-user-id=\"" + fixtures.u2.id + "\">U2</a>, you're mentioned ;)</p>");
        done();
      };

      CommentController.create(req, res);
    });

  });


});
