var findCommunityIds = Promise.method(req => {
  if (req.param('communityId')) {
    return [req.param('communityId')]
  } else {
    return Promise.join(
      Network.activeCommunityIds(req.session.userId),
      Membership.activeCommunityIds(req.session.userId)
    ).then(ids => _(ids).flatten().uniq().value())
  }
})

var setFilters = Promise.method(req => {
  if (req.param('projectId')) {
    return {project: req.param('projectId')}
  } else {
    return findCommunityIds(req)
      .then(communityIds => ({communities: communityIds}))
  }
})

module.exports = {
  show: function (req, res) {
    var term = req.param('q').trim()
    var resultTypes = req.param('include')
    var limit = req.param('limit') || 10
    var offset = req.param('offset') || 0

    return findCommunityIds(req)
    .then(function (communityIds) {
      return Promise.join(
        _.contains(resultTypes, 'posts') && Search.forPosts({
          term: term,
          limit: limit,
          offset: offset,
          communities: communityIds,
          sort: 'post.created_at'
        }).fetchAll({withRelated: PostPresenter.relations(req.session.userId)}),
        _.contains(resultTypes, 'people') && Search.forUsers({
          term: term,
          limit: limit,
          offset: offset,
          communities: communityIds
        }).fetchAll({withRelated: ['skills', 'organizations']})
      )
    })
    .spread(function (posts, people) {
      res.ok({
        posts_total: (posts.length > 0 ? Number(posts.first().get('total')) : 0),
        posts: posts.map(PostPresenter.present),
        people_total: (people.length > 0 ? Number(people.first().get('total')) : 0),
        people: people.map(function (user) {
          return _.chain(user.attributes)
            .pick(UserPresenter.shortAttributes)
            .extend({
              skills: Skill.simpleList(user.relations.skills),
              organizations: Organization.simpleList(user.relations.organizations)
            }).value()
        })
      })
    })
    .catch(res.serverError)
  },

  autocomplete: function (req, res) {
    var term = req.param('q').trim()
    var resultType = req.param('type')
    var sort = resultType === 'posts' ? 'post.created_at' : null
    var method = resultType === 'posts' ? Search.forPosts : Search.forUsers

    return setFilters(req)
    .then(filters => method(_.extend(filters, {
      autocomplete: term,
      limit: req.param('limit') || 5,
      sort: sort
    })).fetchAll())
    .then(results => {
      if (resultType === 'posts') {
        res.ok(results.map(result => result.pick('id', 'name')))
      } else {
        res.ok(results.map(result => result.pick('id', 'name', 'avatar_url')))
      }
    })
    .catch(res.serverError)
  }

}
