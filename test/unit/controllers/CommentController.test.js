var setup = require(require('root-path')('test/setup')),
  format = require('util').format,
  Promise = require("bluebird"),
  CommentController = requireFromRoot('api/controllers/CommentController');

describe('CommentController', function() {
  var fixtures, req, res;

  before(function(done) {
    setup.initDb(function() {
      return Promise.props({
        u1: new User({name: 'U1'}).save(),
        u2: new User({name: 'U2'}).save(),
        u3: new User({name: 'U3'}).save(),
        p1: new Post({name: 'P1'}).save(),
        c1: new Community({name: "C1"}).save()
      }).then(function(props) {
        fixtures = props;

        req = {
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
      var commentText = format("<p>Hey <a data-user-id=\"%s\">U2</a> and <a data-user-id=\"%s\">U3</a>, you're mentioned ;)</p>",
        fixtures.u2.id, fixtures.u3.id);

      req.param = function(name) {
        if (name == 'text') return commentText;
      };

      res.locals = {post: fixtures.p1};

      // FIXME find a better solution to this nested try/catch
      res.ok = function(data) {
        try {
          expect(data).to.exist;
          expect(data.user).to.exist;
          expect(data.text).to.equal(commentText);

          // mentioning should cause email notifications
          expect(require('kue').jobCount()).to.equal(2);

          fixtures.p1.load('followers').then(function(post) {
            try {
              expect(post.relations.followers.length).to.equal(2);
              done();
            } catch(err) {
              done(err);
            }
          })
        } catch(err) {
          done(err);
        }
      };

      CommentController.create(req, res);
    });

  });


});
