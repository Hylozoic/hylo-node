require(require('root-path')('test/setup'))

describe('Network', () => {
  describe('.activeCommunityIds', () => {
    it('generates correct SQL', () => {
      const expected = 'select "id" from "communities" where "network_id" in ' +
        '(select distinct "network_id" from "communities" where "id" in ' +
        '(select "community_id" from "communities_users" where "user_id" = ? and "active" = ?) ' +
        'and network_id is not null)'
      const query = Network.activeCommunityIds(42, true).toSQL()
      expect(query.sql).to.equal(expected)
      expect(query.bindings).to.deep.equal([42, true])
    })
  })
})
