var setup = require(require('root-path')('test/setup')),
  Promise = require("bluebird"),
  PostController = requireFromRoot('api/controllers/PostController');

describe('PostController', function() {
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
          param: function(name){
            return this.params[name];
          },
          session: {userId: fixtures.u1.id},
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

    it('saves mentions', function(done) {
      req.params = {
        name: "NewPost",
          description: "<p>Hey <a data-user-id=\"" + fixtures.u2.id + "\">U2</a>, you're mentioned ;)</p>",
          postType: "intention",
          communityId: fixtures.c1.id
      };

      res.ok = function(data) {
        expect(data).to.exist;
        expect(data.followers.length).to.equal(2);
        expect(data.name).to.equal("NewPost");
        expect(data.description).to.equal("<p>Hey <a data-user-id=\"" + fixtures.u2.id + "\">U2</a>, you're mentioned ;)</p>");
        done();
      };

      PostController.create(req, res);
    });

    it('sanitizes the description', function(done) {
      req.params = {
        name: "NewMaliciousPost",
        description: "<script>alert('test')</script><p>Hey <a data-user-id='" + fixtures.u2.id + "' data-malicious='alert(blah)'>U2</a>, you're mentioned ;)</p>",
        postType: "intention",
        communityId: fixtures.c1.id
      };

      res.ok = function(data) {
        expect(data).to.exist;
        expect(data.followers.length).to.equal(2);
        expect(data.name).to.equal("NewMaliciousPost");
        expect(data.description).to.equal("<p>Hey <a data-user-id=\"" + fixtures.u2.id + "\">U2</a>, you're mentioned ;)</p>");
        done();
      };

      PostController.create(req, res);
    });

  });

});
