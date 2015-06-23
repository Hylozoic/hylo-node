var setup = require(require('root-path')('test/setup'));

describe('PostController', () => {
  var fixtures, req, res;

  before(() => {
    return setup.clearDb().then(() => {
      return Promise.props({
        u1: new User({name: 'U1'}).save(),
        u2: new User({name: 'U2'}).save(),
        p1: new Post({name: 'P1'}).save(),
        c1: new Community({name: "C1", slug: 'c1'}).save()
      });
    }).then(function(props) {
      fixtures = props;

      req = {
        allParams: () => {
          return this.params;
        },
        param: function(name){
          return this.params[name];
        },
        session: {userId: fixtures.u1.id},
      };

      res = {serverError: () => {}, ok: () => {}};
    });
  });

  describe('#create', () => {

    it('saves mentions', () => {
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
      };

      return PostController.create(req, res);
    });

    it('sanitizes the description', () => {
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
      };

      return PostController.create(req, res);
    });
  });

  describe('#createForProject', () => {

    describe('for a draft project', () => {

      var project;

      beforeEach(() => {
        project = new Project({title: 'Project!', slug: 'project', community_id: fixtures.c1.id});
        return project.save();
      });

      it('sets visibility to DRAFT_PROJECT', () => {
        req.params = {
          name: "i want!",
          description: "<p>woo</p>",
          postType: "request",
          projectId: project.id,
          communityId: fixtures.c1.id
        };

        return PostController.createForProject(req, res)
        .then(() => project.load('posts'))
        .then(() => {
          var post = project.relations.posts.first();
          expect(post).to.exist;
          expect(post.get('name')).to.equal('i want!');
          expect(post.get('visibility')).to.equal(Post.Visibility.DRAFT_PROJECT);
        })
      });

    });

  });

});
