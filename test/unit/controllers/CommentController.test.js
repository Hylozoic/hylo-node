var setup = require(require('root-path')('test/setup')),
  format = require('util').format,
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

      // FIXME find a better solution than this nested try/catch
      res.ok = function(data) {
        try {
          expect(data).to.exist;
          expect(data.user).to.exist;
          expect(data.text).to.equal(commentText);

          // mentioning should cause email notifications
          expect(require('kue').jobCount()).to.equal(2);

          // the two mentioned users and the commenter should now be followers
          fixtures.p1.load('followers').then(function(post) {
            try {
              expect(post.relations.followers.length).to.equal(3);
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

  describe('#createFromEmail', function() {
    var params = {
      'stripped-text': 'foo bar baz'
    };

    before(function() {
      req = {
        param: function(name) {
          return params[name];
        }
      };
      res = {};

      Analytics.track = chai.spy(Analytics.track);
    });

    it('raises an error with an invalid address', function() {
      res = {
        serverError: chai.spy(function(err) {})
      };

      CommentController.createFromEmail(req, res);
      expect(res.serverError).to.have.been.called;
    });

    it('creates a comment', function(done) {
      params.To = Email.seedReplyAddress(fixtures.p1.id, fixtures.u3.id);

      res = {
        ok: chai.spy(function() {}),
        serverError: done
      };

      CommentController.createFromEmail(req, res)
      .then(function() {
        expect(Analytics.track).to.have.been.called;
        expect(res.ok).to.have.been.called;
        return fixtures.p1.comments().fetch();
      })
      .then(function(comments) {
        var comment = comments.last();
        expect(comment.get('comment_text')).to.equal('foo bar baz');
        expect(comment.get('post_id')).to.equal(fixtures.p1.id);
        expect(comment.get('user_id')).to.equal(fixtures.u3.id);
        done();
      })
      .catch(done);
    });

  });


});
