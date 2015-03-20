var setup = require(require('root-path')('test/setup')),
  format = require('util').format;

describe('CommentController', function() {
  var fixtures, req, res;

  before(function(done) {
    setup.initDb(function() {
      Promise.props({
        u1: new User({name: 'U1'}).save(),
        u2: new User({name: 'U2'}).save(),
        u3: new User({name: 'U3'}).save(),
        p1: new Post({name: 'P1'}).save(),
        c1: new Community({name: "C1"}).save()
      }).then(function(props) {
        fixtures = props;
        done();
      });
    });
  });

  after(function(done) {
    setup.clearDb(done);
  });

  describe('#create', function() {
    before(function() {
      req = {
        session: {userId: fixtures.u1.id}
      };
    });

    it('creates a comment', function(done) {
      var commentText = format("<p>Hey <a data-user-id=\"%s\">U2</a> and <a data-user-id=\"%s\">U3</a>! ;)</p>",
        fixtures.u2.id, fixtures.u3.id),
        responseData;

      req.param = function(name) {
        if (name == 'text') return commentText;
      };

      res = {
        locals: {post: fixtures.p1},
        serverError: done,
        ok: spy(function(x) { responseData = x; })
      };

      CommentController.create(req, res)
      .then(function() {
        expect(res.ok).to.have.been.called();
        expect(responseData).to.exist;
        expect(responseData.user).to.exist;
        expect(responseData.text).to.equal(commentText);

        // mentioning should cause email notifications
        expect(require('kue').jobCount()).to.equal(2);

        return fixtures.p1.load('followers');
      })
      .then(function(post) {
        expect(post.relations.followers.length).to.equal(3);
        done();
      })
      .catch(done);
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
    });

    it('raises an error with an invalid address', function() {
      res = {
        serverError: spy(function(err) {})
      };

      CommentController.createFromEmail(req, res);
      expect(res.serverError).to.have.been.called();
    });

    it('creates a comment', function(done) {
      Analytics.track = spy(Analytics.track);
      params.To = Email.seedReplyAddress(fixtures.p1.id, fixtures.u3.id);

      res = {
        ok: spy(function() {}),
        serverError: done
      };

      CommentController.createFromEmail(req, res)
      .then(function() {
        expect(Analytics.track).to.have.been.called();
        expect(res.ok).to.have.been.called();
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
