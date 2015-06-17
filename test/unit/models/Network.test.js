var setup = require(require('root-path')('test/setup'));

describe('Network', () => {

  describe('.activeCommunityIds', () => {

    it('generates correct SQL', () => {
      var expected = 'select "id" from "community" where "network_id" in '+
        '(select "network_id" from "community" where "id" in '+
        '(select "community_id" from "users_community" where "users_id" = ? and "active" = ?))';
      var query = Network.activeCommunityIds(42, true).toSQL();
      expect(query.sql).to.equal(expected);
      expect(query.bindings).to.deep.equal([42, true]);
    });

  });

});