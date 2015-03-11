module.exports = {

  show: function(req, res) {
    var term = req.param('q').trim(),
      communityId = req.param('communityId'),
      resultTypes = req.param('include'),
      offset = req.param('offset') || 0;

    return Promise.join(

      (!_.contains(resultTypes, 'seeds') ? [] :
        Search.forSeeds({
          term: term,
          limit: 10,
          offset: offset,
          communities: [parseInt(communityId)]
        }).fetchAll()
      ),

      (!_.contains(resultTypes, 'people') ? [] :
        Search.forUsers({
          term: term,
          limit: 10,
          offset: offset,
          communities: [parseInt(communityId)]
        }).fetchAll({withRelated: ['skills', 'organizations']})
      )

    ).spread(function(seeds, people) {

      res.ok({
        seeds: seeds,

        people: people.map(function(user) {
          return _.chain(user.attributes)
          .pick([
            'id', 'name', 'avatar_url', 'bio', 'work', 'intention', 'extra_info',
            'twitter_name', 'linkedin_url', 'facebook_url'
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