var setup = require(require('root-path')('test/setup'));

describe('SessionController', function() {

  var req = {
    session: {},
    param: function(name) {
      return this.params[name];
    }
  },
    noop = function() { return function() {} },
    res, cat;

  describe('.create', function() {

    before(function(done) {
      _.extend(req, {
        params: {
          email: 'iam@cat.org',
          password: 'password'
        }
      });

      res = {
        ok: spy(function() {}),
        status: spy(function() { return this }),
        send: noop()
      };

      cat = new User({name: 'Cat', email: 'iam@cat.org'});
      cat.save().then(function() {
        return new LinkedAccount({
          provider_user_id: '$2a$10$UPh85nJvMSrm6gMPqYIS.OPhLjAMbZiFnlpjq1xrtoSBTyV6fMdJS',
          provider_key: 'password',
          user_id: cat.id
        }).save();
      }).exec(done);
    });

    it('works with a valid username and password', function() {
      return SessionController.create(req, res)
      .then(() => {
        expect(res.status).not.to.have.been.called();
        expect(res.ok).to.have.been.called();
        expect(req.session.userId).to.equal(cat.id);
        return User.find(cat.id);
      })
      .then(user => {
        expect(user.get('last_login').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      })
    })

  })

})
