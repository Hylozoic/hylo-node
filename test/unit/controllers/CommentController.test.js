var setup = require(require('root-path')('test/setup'));

describe('CommentController', function() {
  var fixtures, req, res;

  before(function(done) {
    setup.clearDb().then(function() {
      return Promise.props({
        u1: new User({name: 'U1'}).save(),
        u2: new User({name: 'U2'}).save(),
        u3: new User({name: 'U3'}).save(),
        p1: new Post({name: 'P1', active: true}).save(),
        c1: new Community({name: "C1", slug: 'c1'}).save()
      });
    })
    .then(function(props) {
      fixtures = props;
      done();
    });
  });

  describe('#create', function() {
    before(function() {
      req = {
        session: {userId: fixtures.u1.id}
      };
    });

    it('creates a comment', function() {
      var commentText = format("<p>Hey <a data-user-id=\"%s\">U2</a> and <a data-user-id=\"%s\">U3</a>! ;)</p>",
        fixtures.u2.id, fixtures.u3.id),
        responseData;

      req.param = function(name) {
        if (name == 'text') return commentText;
      };

      res = {
        locals: {post: fixtures.p1},
        serverError: spy(console.error),
        ok: spy(function(x) { responseData = x; })
      };

      return CommentController.create(req, res)
      .then(function() {
        expect(res.ok).to.have.been.called();
        expect(res.serverError).not.to.have.been.called();
        expect(responseData).to.exist;
        expect(responseData.user).to.exist;
        expect(responseData.text).to.equal(commentText);
        return fixtures.p1.load('comments');
      })
      .then(post => {
        var comment = post.relations.comments.first();

        var job = require('kue').getJobs()[0];
        expect(job).to.exist;
        expect(job.type).to.equal('classMethod');
        expect(job.data).to.deep.equal({
          className: 'Comment',
          methodName: 'sendNotifications',
          commentId: comment.id
        });

      });

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
      params.To = Email.postReplyAddress(fixtures.p1.id, fixtures.u3.id);

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
        var comment = comments.find(c => c.get('post_id') === fixtures.p1.id);
        expect(comment).to.exist;
        expect(comment.get('text')).to.equal('foo bar baz');
        expect(comment.get('user_id')).to.equal(fixtures.u3.id);
        done();
      })
      .catch(done);
    });

  });


});
