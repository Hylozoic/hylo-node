module.exports = {

  show: function(req, res) {
    var term = req.param('q').trim(),
      resultTypes = req.param('include'),
      limit = req.param('limit') || 10,
      offset = req.param('offset') || 0;

    var findCommunityIds = Promise.method(function() {
      if (req.param('communityId')) {
        return [parseInt(req.param('communityId'))];
      } else {
        return Membership.activeCommunityIds(req.session.userId);
      }
    });

    return findCommunityIds().then(function(communityIds) {

      return Promise.join(
        (!_.contains(resultTypes, 'seeds') ? [] :
          Search.forSeeds({
            term: term,
            limit: limit,
            offset: offset,
            communities: communityIds,
            sort: 'post.creation_date'
          }).fetchAll({withRelated: PostPresenter.relations(req.session.userId)})
        ),
        (!_.contains(resultTypes, 'people') ? [] :
          Search.forUsers({
            term: term,
            limit: limit,
            offset: offset,
            communities: communityIds
          }).fetchAll({withRelated: ['skills', 'organizations']})
        )
      );

    }).spread(function(seeds, people) {

      res.ok({
        seeds_total: (seeds.length > 0 ? parseInt(seeds.first().get('total')) : 0),

        seeds: seeds.map(function(seed) {
          return PostPresenter.present(seed);
        }),

        people_total: (people.length > 0 ? parseInt(people.first().get('total')) : 0),

        people: people.map(function(user) {
          return _.chain(user.attributes)
          .pick([
            'id', 'name', 'avatar_url', 'bio'
          ])
          .extend({
            skills: Skill.simpleList(user.relations.skills),
            organizations: Organization.simpleList(user.relations.organizations)
          }).value();
        })

      });

    }).catch(res.serverError.bind(res));

  }

};