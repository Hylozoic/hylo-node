var setup = require(require('root-path')('test/setup'));

describe('User', function() {

  before(function(done) {
    setup.initDb(done);
    var user = new User({name: 'Cat'});
    user.save();
  });

  it('can be found', function(done) {
    User.where({name: 'Cat'}).fetch().then(function(cat) {
      expect(cat).to.exist;
      expect(cat.get('name')).to.equal('Cat');
    }).done(done);
  })

  it('can join communities', function(done) {
    var community1 = new Community({name: 'House'}),
      community2 = new Community({name: 'Yard'}),
      cat;

    User.named('Cat')
    .then(function(u) { cat = u; })
    .then(function() { return community1.save(); })
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
    .done(done);

  });

  it('can become moderator', function(done) {
    var house = new Community({name: 'House'}),
      cat, membership;

    User.named('Cat')
    .then(function(user) { cat = user; })
    .then(function() { return house.save(); })
    .then(function() { return cat.joinCommunity(house); })
    .then(function() { return cat.setModerator(house); })
    .then(function() { return cat.memberships().query({where: {community_id: house.id}}).fetchOne(); })
    .then(function(membership) {
      expect(membership).to.exist;
      expect(membership.get('role')).to.equal(1);
    })
    .done(done);

  });

})