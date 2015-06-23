var setup = require(require('root-path')('test/setup'));

describe('UserController', function() {

  var noop = () => () => this,
    req, res;

  beforeEach(function() {
    req = {
      allParams: () => this.params,
      param: key => this.params[key],
      __: sails.__
    };
    return setup.clearDb();
  });

  describe('.create', function() {
    var community;

    beforeEach(function() {
      res = {
        send: console.error,
        status: spy(noop()),
        ok: spy(noop())
      };

      UserSession.login = spy(function() {});
      User.create = spy(User.create);

      community = new Community({beta_access_code: 'foo', name: 'foo', slug: 'foo'});
      return community.save();
    });

    it('works with a username and password', function() {
      _.extend(req, {
        params: {
          email: 'foo@bar.com',
          password: 'password!',
          code: 'foo',
          login: true
        },
        session: {}
      });

      return UserController.create(req, res).then(function() {
        expect(res.status).not.to.have.been.called();
        expect(User.create).to.have.been.called();
        expect(UserSession.login).to.have.been.called();
        expect(res.ok).to.have.been.called();

        return User.where({email: 'foo@bar.com'}).fetch({withRelated: ['onboarding']});
      })
      .then(function(user) {
        var onboarding = user.relations.onboarding;
        expect(onboarding).not.to.be.null;
        expect(onboarding.get('user_id')).to.equal(user.id);
        expect(onboarding.get('type')).to.equal('onboarding');
        expect(onboarding.get('status').step).to.equal('start');
      });
    });

    describe('with an invitation to a community', function() {

      var invitation;

      beforeEach(() => {
        var inviter = new User({email: 'inviter@foo.com'});
        return inviter.save()
        .then(() => Invitation.create({
          communityId: community.id,
          userId: inviter.id,
          email: "foo@bar.com"
        }))
        .tap(i => invitation = i);
      });

      it('works', function() {
        _.extend(req, {
          params: {
            email: 'foo@bar.com',
            password: 'password!',
            login: true
          },
          session: {invitationId: invitation.id}
        });

        return UserController.create(req, res).then(function() {
          expect(res.status).not.to.have.been.called();
          expect(User.create).to.have.been.called();
          expect(UserSession.login).to.have.been.called();
          expect(res.ok).to.have.been.called();

          return User.where({email: 'foo@bar.com'}).fetch({withRelated: ['communities']});
        })
        .then(user => {
          var community = user.relations.communities.first();
          expect(community).to.exist;
          expect(community.get('name')).to.equal('foo');
        });
      });

    });

  });

  describe('with an existing user', function() {
    var u1, u2;

    beforeEach(function() {
      u1 = new User({email: 'foo@bar.com'});
      u2 = new User({email: 'foo2@bar2.com'});
      return Promise.join(u1.save(), u2.save());
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
          params: {userId: u1.id, email: u2.get('email')}
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
              expect(Skill.simpleList(user.relations.skills).sort()).to.eql(['sitting', 'standing']);
              done();
            });
          },
          serverError: function(err) { done(err); }
        };

        UserController.update(req, res);
      });

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

  })



});
