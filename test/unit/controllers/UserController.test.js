var setup = require(require('root-path')('test/setup')),
  Promise = require("bluebird"),
  UserController = requireFromRoot('api/controllers/UserController');

describe('UserController', function() {

  var u1 = new User({email: 'foo@bar.com'}),
    u2 = new User({email: 'baz@bax.com'}),
    req = {
      allParams: function() { return this.params },
      param: function(key) { return this.params[key] },
      __: __
    }, res;

  before(function(done) {
    setup.initDb(function() {
      Promise.join(
        u1.save(),
        u2.save()
      ).then(function() {
        done();
      }).catch(done);
    })
  });

  describe('#update', function() {

    it('halts on invalid email', function(done) {

      _.extend(req, {
        params: {id: u1.id, email: 'lol'}
      });

      res = {
        badRequest: function(message) {
          expect(message).to.equal(__('invalid-email'));
          done();
        }
      };

      UserController.update(req, res);
    });

    it('halts on duplicate email', function(done) {
      _.extend(req, {
        params: {id: u1.id, email: 'baz@bax.com'}
      });

      res = {
        badRequest: function(message) {
          expect(message).to.equal(__('duplicate-email'));
          done();
        }
      };

      UserController.update(req, res);
    });

    it('only updates changed fields', function(done) {
      _.extend(req, {
        params: {id: u1.id, twitter_name: 'ev'}
      });

      res = {
        ok: function() { done(); }
      };

      User.find = function() {
        return Promise.resolve(u1);
      }

      u1.save = function(fields, options) {
        expect(fields).to.eql({twitter_name: 'ev'});
        expect(options).to.eql({patch: true});
      }

      UserController.update(req, res);
    });

    it('updates skills', function(done) {
      _.extend(req, {
        params: {id: u1.id, skills: ['standing', 'sitting']}
      });

      res = {
        ok: function() {
          u1.load('skills').then(function(user) {
            expect(Skill.simpleList(user.relations.skills)).to.eql(['standing', 'sitting']);
            done();
          });
        }
      };

      UserController.update(req, res);
    });

  });

});
