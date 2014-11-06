var setup = require(require('root-path')('test/setup'));

describe('User', function() {

  before(function(done) {
    setup.createDb(done);
    var user = new User({name: 'Cat'});
    user.save();
  });

  it('can be found', function(done) {
    User.where({name: 'Cat'}).fetch().then(function(user) {
      expect(user).to.exist;
      expect(user.get('name')).to.equal('Cat');
    }).done(done);
  })

  it('can join communities', function(done) {
    var community1 = new Community({name: 'House'}),
      community2 = new Community({name: 'Yard'}),
      user;

    User.where({name: 'Cat'}).fetch()
    .then(function(u) { user = u; })
    .then(function() { return community1.save(); })
    .then(function() { return community2.save(); })
    .then(function() { return user.joinCommunity(community1); })
    .then(function() { return user.joinCommunity(community2); })
    .then(function() { return user.communities().fetch(); })
    .then(function(communities) {
      expect(communities).to.exist;
      expect(communities.models).to.exist;
      expect(communities.models).not.to.be.empty;
      expect(communities.models[0].get('name')).to.equal('House');
      expect(communities.models[1].get('name')).to.equal('Yard');
    })
    .done(done);

  });
})