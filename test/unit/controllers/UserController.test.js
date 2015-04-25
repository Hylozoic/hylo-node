var setup = require(require('root-path')('test/setup'));

describe('UserController', function() {

  var noop = function() { return (function() { return this }); },
    req, res, u1;

  beforeEach(function(done) {
    req = {
      allParams: function() { return this.params },
      param: function(key) { return this.params[key] },
      __: sails.__
    };
    u1 = new User({email: 'foo@bar.com'});
    u1.save().exec(done);
  });

  afterEach(function(done) {
    setup.clearDb(done);
  });

  describe('.update', function() {

    it('halts on invalid email', function(done) {

      _.extend(req, {
        params: {userId: u1.id, email: 'lol'}
      });

      res = {
        badRequest: function(message) {
          expect(message).to.equal(sails.__('invalid-email'));
          done();
        },
        serverError: done
      };

      UserController.update(req, res);
    });

    it('halts on duplicate email', function(done) {
      _.extend(req, {
        params: {userId: u1.id, email: 'baz@bax.com'}
      });

      res = {
        badRequest: function(message) {
          expect(message).to.equal(sails.__('duplicate-email'));
          done();
        },
        serverError: done
      };

      UserController.update(req, res);
    });

    it('only updates changed fields', function() {
      _.extend(req, {
        params: {userId: u1.id, twitter_name: 'ev'}
      });

      res = {
        ok: spy(noop()),
        serverError: function(err) {
          console.error(err);
          console.error(err.stack);
        }
      };

      User.trueFind = User.find;
      User.find = function(id) {
        return Promise.resolve(id == u1.id ? u1 : null);
      };

      u1.save = spy(function(fields, options) {
        expect(fields).to.eql({twitter_name: 'ev'});
        expect(options).to.eql({patch: true});
      });

      return UserController.update(req, res).then(function() {
        expect(u1.save).to.have.been.called();
      })
      .finally(function() {
        User.find = User.trueFind;
      });
    });

    it('updates skills', function(done) {
      _.extend(req, {
        params: {userId: u1.id, skills: ['standing', 'sitting']}
      });

      res = {
        ok: function() {
          u1.load('skills').then(function(user) {
            expect(Skill.simpleList(user.relations.skills)).to.eql(['standing', 'sitting']);
            done();
          });
        },
        serverError: function(err) { done(err); }
      };

      UserController.update(req, res);
    });

  });

  describe('.create', function() {

    before(function(done) {
      new Community({beta_access_code: 'foo', name: 'foo'}).save().exec(done);
    });

    it('works with a username and password', function(done) {
      _.extend(req, {
        params: {
          email: 'foo@bar.com',
          password: 'password!',
          code: 'foo',
          login: true
        },
        session: {}
      });

      res = {
        send: console.error,
        status: spy(noop()),
        ok: spy(noop())
      };

      UserSession.login = spy(function() {});
      User.create = spy(User.create);

      UserController.create(req, res).then(function() {
        expect(res.status).not.to.have.been.called();
        expect(User.create).to.have.been.called();
        expect(UserSession.login).to.have.been.called();
        expect(res.ok).to.have.been.called();
        done();
      })
      .catch(done);

    })

  });

  describe('.findSelf', function() {

    it('returns a response with private details', function() {
      var response;

      req.session = {
        userId: u1.id
      };

      res = {
        ok: spy(function(data) {
          response = data;
        }),
        serverError: spy(function(err) {
          console.error(err);
          console.error(err.stack);
        })
      };

      return UserController.findSelf(req, res).then(function() {
        expect(res.ok).to.have.been.called();
        expect(res.serverError).not.to.have.been.called();
        expect(response.notification_count).to.exist;
      });
    });
  });

});
