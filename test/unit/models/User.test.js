var bcrypt = require('bcrypt'),
  setup = require(require('root-path')('test/setup'));

describe('User', function() {

  var cat;

  before(function(done) {
    cat = new User({name: 'Cat', email: 'iam@cat.org'});
    cat.save().exec(done);
  });

  after(function(done) {
    setup.clearDb(done);
  });

  it('can be found', function(done) {
    User.where({name: 'Cat'}).fetch().then(function(user) {
      expect(user).to.exist;
      expect(user.get('name')).to.equal('Cat');
    }).exec(done);
  })

  it('can join communities', function(done) {
    var community1 = new Community({name: 'House'}),
      community2 = new Community({name: 'Yard'});

    community1.save()
    .then(function() { return community2.save(); })
    .then(function() { return cat.joinCommunity(community1); })
    .then(function() { return cat.joinCommunity(community2); })
    .then(function() { return cat.communities().fetch(); })
    .then(function(communities) {
      expect(communities).to.exist;
      expect(communities.models).to.exist;
      expect(communities.models).not.to.be.empty;
      expect(communities.models[0].get('name')).to.equal('House');
      expect(communities.models[1].get('name')).to.equal('Yard');
    })
    .exec(done);

  });

  it('can become moderator', function(done) {
    var house = new Community({name: 'House'}),
      membership;

    house.save()
    .then(function() { return cat.joinCommunity(house); })
    .then(function() { return cat.setModeratorRole(house); })
    .then(function() { return cat.memberships().query({where: {community_id: house.id}}).fetchOne(); })
    .then(function(membership) {
      expect(membership).to.exist;
      expect(membership.get('role')).to.equal(1);
    })
    .done(done);

  });

  describe('#setSanely', function() {

    it("doesn't assume that any particular field is set", function() {
      new User().setSanely({});
    });

    it('sanitizes twitter usernames', function() {
      var user = new User();

      user.setSanely({twitter_name: '@user'});
      expect(user.get('twitter_name')).to.equal('user');

      user.setSanely({twitter_name: ' '});
      expect(user.get('twitter_name')).to.be.null;
    });

  });

  describe('.authenticate', function() {

    before(function() {
      return new LinkedAccount({
        provider_user_id: '$2a$10$UPh85nJvMSrm6gMPqYIS.OPhLjAMbZiFnlpjq1xrtoSBTyV6fMdJS',
        provider_key: 'password',
        user_id: cat.id
      }).save();
    })

    it('accepts a valid password', function() {
      return expect(User.authenticate('iam@cat.org', 'password'))
      .to.eventually.satisfy(function(user) {
        return user && user.id == cat.id && user.name == cat.name;
      });
    });

    it('rejects an invalid password', function() {
      return expect(User.authenticate('iam@cat.org', 'pawsword')).to.be.rejected;
    });

  });

  describe('.create', function() {

    var community;

    before(function(done) {
      community = new Community({name: 'foo'});
      community.save().exec(done);
    });

    it('works with a password', function() {
      return bookshelf.transaction(function(trx) {
        return User.create({
          email: 'foo@bar.com',
          community: community,
          account: {password: 'password!'}
        }, {transacting: trx});
      })
      .then(function(user) {
        expect(user.id).to.exist;

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function(account) {
            expect(account).to.exist;
            expect(account.get('provider_key')).to.equal('password');
            expect(bcrypt.compareSync('password!', account.get('provider_user_id'))).to.be.true;
          }),
          Membership.where({users_id: user.id}).fetch().then(function(membership) {
            expect(membership).to.exist;
            expect(membership.get('community_id')).to.equal(community.id);
          })
        );
      });
    });

    it('works with a google id', function() {
      todo;
    })

  })

})