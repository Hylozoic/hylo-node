var setup = require(require('root-path')('test/setup')),
  Promise = require('bluebird'),
  checkAndSetMembership = Promise.promisify(require(require('root-path')('api/policies/checkAndSetMembership')));

describe('CommunityController', () => {

  describe('.findOne', () => {

    var user, community, req, res;

    beforeEach(() => {
      req = {
        session: {},
        params: {},
        param: function(key) {
          return this.params[key];
        }
      };
      res = {
        locals: {},
        ok: spy(function(data) {
          res.body = data;
        })
      };
      community = new Community({name: 'foo', slug: 'foo', beta_access_code: 'sekrit'});
      user = new User();
      return Promise.join(user.save(), community.save())
      .then(() => user.joinCommunity(community))
      .then(() => {
        req.params.communityId = community.id;
        req.session.userId = user.id;
      });
    });

    it('does not include the invitation code', () => {
      return checkAndSetMembership(req, res)
      .then(() => CommunityController.findOne(req, res))
      .then(() => {
        expect(res.ok).to.have.been.called();
        expect(res.body).to.deep.equal({
          id: community.id,
          name: 'foo',
          slug: 'foo',
          avatar_url: null,
          banner_url: null,
          description: null,
          settings: {}
        });
      });

    });

  });

});