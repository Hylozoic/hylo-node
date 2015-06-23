var setup = require(require('root-path')('test/setup'));

describe('Organization', function() {

  var cat, otherCat;

  before(function() {
    cat = new User({name: 'Cat'});
    otherCat = new User({name: 'Other Cat'});

    return setup.clearDb().then(function() {
      return Promise.join(cat.save(), otherCat.save());
    })
    .then(function() {
      return Promise.join(
        Organization.query().insert({org_name: 'House of Yes', user_id: cat.id}),
        Organization.query().insert({org_name: 'Cat Club', user_id: cat.id}),
        Organization.query().insert({org_name: 'House of Yes', user_id: otherCat.id})
      );
    });
  });

  describe('#update', function() {

    it('adds and removes orgs for one user', function(done) {
      Organization.update(['Cat Club', 'Heliopolis', 'Dance Church'], cat.id).then(function() {
        return cat.load('organizations');
      }).then(function() {
        var organizations = Organization.simpleList(cat.relations.organizations);
        expect(organizations.sort()).to.deep.equal(['Cat Club', 'Dance Church', 'Heliopolis']);
        return otherCat.load('organizations');
      }).then(function() {
        // should not affect other users' organizations
        var organizations = Organization.simpleList(otherCat.relations.organizations);
        expect(organizations).to.deep.equal(['House of Yes']);
      }).exec(done);
    });

    it('makes no changes if the list is the same', function(done) {
      // the order of skills is reversed in this argument
      Organization.update(['House of Yes', 'Cat Club'], cat.id).then(function() {
        return cat.load('organizations');
      }).then(function() {
        var organizations = Organization.simpleList(cat.relations.organizations);
        // but the stored order is still the original one,
        // because no changes were made to the database
        expect(organizations).to.deep.equal(['Cat Club', 'House of Yes']);
      }).exec(done);
    });

  })

});
