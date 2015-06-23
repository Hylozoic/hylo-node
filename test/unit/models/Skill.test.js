var setup = require(require('root-path')('test/setup'));

describe('Skill', function() {

  var cat, otherCat;

  before(function() {
    cat = new User({name: 'Cat'});
    otherCat = new User({name: 'Other Cat'});

    return setup.clearDb().then(function() {
      return Promise.join(cat.save(), otherCat.save());
    })
    .then(function() {
      return Promise.join(
        Skill.query().insert({skill_name: 'meowing', user_id: cat.id}),
        Skill.query().insert({skill_name: 'clawing', user_id: cat.id}),
        Skill.query().insert({skill_name: 'meowing', user_id: otherCat.id})
      );
    });
  });

  describe('#update', function() {

    it('adds and removes skills for one user', function(done) {
      Skill.update(['clawing', 'sleeping', 'pouncing'], cat.id).then(function() {
        return cat.load('skills');
      }).then(function() {
        var skills = Skill.simpleList(cat.relations.skills);
        expect(skills.sort()).to.deep.equal(['clawing', 'pouncing', 'sleeping']);
        return otherCat.load('skills');
      }).then(function() {
        // should not affect other users' skills
        var skills = Skill.simpleList(otherCat.relations.skills);
        expect(skills).to.deep.equal(['meowing']);
      }).exec(done);
    });

    it('makes no changes if the list is the same', function(done) {
      // the order of skills is reversed in this argument
      Skill.update(['meowing', 'clawing'], cat.id).then(function() {
        return cat.load('skills');
      }).then(function() {
        var skills = Skill.simpleList(cat.relations.skills);
        // but the stored order is still the original one,
        // because no changes were made to the database
        expect(skills).to.deep.equal(['clawing', 'meowing']);
      }).exec(done);
    });

  })

});
