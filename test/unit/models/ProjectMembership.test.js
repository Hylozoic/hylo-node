var setup = require(require('root-path')('test/setup'));

describe.skip('ProjectMembership', () => {

  describe('.create', () => {

    describe('with duplicate values', () => {

      var membership;

      beforeEach(() => {
        membership = new ProjectMembership({user_id: 42, project_id: 8});
        return membership.save();
      });

      it('returns the original', () => {

      });

    })

  });

});