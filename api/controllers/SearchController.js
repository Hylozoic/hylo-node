var findCommunityIds = Promise.method(function(req) {
  if (req.param('communityId')) {
    return [req.param('communityId')];
  } else {
    return Network.activeCommunityIds(req.session.userId);
  }
});

module.exports = {

  show: function(req, res) {
    var term = req.param('q').trim(),
      resultTypes = req.param('include'),
      limit = req.param('limit') || 10,
      offset = req.param('offset') || 0;

    return findCommunityIds(req).then(function(communityIds) {

      return Promise.join(
        (!_.contains(resultTypes, 'posts') ? [] :
          Search.forPosts({
            term: term,
            limit: limit,
            offset: offset,
            communities: communityIds,
            sort: 'post.created_at'
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

    }).spread(function(posts, people) {
      res.ok({
        posts_total: (posts.length > 0 ? parseInt(posts.first().get('total')) : 0),
        posts: posts.map(PostPresenter.present),
        people_total: (people.length > 0 ? parseInt(people.first().get('total')) : 0),
        people: people.map(function(user) {
          return _.chain(user.attributes)
          .pick('id', 'name', 'avatar_url', 'bio')
          .extend({
            skills: Skill.simpleList(user.relations.skills),
            organizations: Organization.simpleList(user.relations.organizations)
          }).value();
        })
      });
    }).catch(res.serverError);

  },

  autocomplete: function(req, res) {
    var term = req.param('q').trim(),
      resultType = req.param('type'),
      sort = resultType === 'posts' ? 'post.created_at' : null,
      method = resultType === 'posts' ? Search.forPosts : Search.forUsers;

    return findCommunityIds(req).then(communityIds => {
      return method({
        autocomplete: term,
        limit: req.param('limit') || 5,
        communities: communityIds,
        sort: sort
      }).fetchAll()
    }).then(results => {
      if (resultType === 'posts') {
        res.ok(results.map(result => result.pick('id', 'name')));
      } else {
        res.ok(results.map(result => result.pick('id', 'name', 'avatar_url')));
      }
    })
    .catch(res.serverError);
  }

};