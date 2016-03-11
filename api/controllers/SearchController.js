var findCommunityIds = Promise.method(req => {
  if (req.param('communityId')) {
    return [req.param('communityId')]
  } else if (req.param('type') === 'communities' && req.param('moderated')) {
    if (Admin.isSignedIn(req)) {
      return Community.fetchAll()
      .then(cs => cs.pluck('id'))
    } else {
      return Membership.activeCommunityIds(req.session.userId, true)
    }
  } else {
    return Promise.join(
      Network.activeCommunityIds(req.session.userId),
      Membership.activeCommunityIds(req.session.userId)
    ).then(ids => _(ids).flatten().uniq().value())
  }
})

const getTotal = records =>
  records && records.length > 0 ? Number(records.first().get('total')) : 0

module.exports = {
  show: function (req, res) {
    var term = req.param('q').trim()
    var resultTypes = req.param('include')
    var limit = req.param('limit') || 10
    var offset = req.param('offset') || 0

    return findCommunityIds(req)
    .then(function (communityIds) {
      return Promise.join(
        _.includes(resultTypes, 'posts') && Search.forPosts({
          term: term,
          limit: limit,
          offset: offset,
          communities: communityIds,
          sort: 'post.created_at'
        }).fetchAll({withRelated: PostPresenter.relations(req.session.userId)}),
        _.includes(resultTypes, 'people') && Search.forUsers({
          term: term,
          limit: limit,
          offset: offset,
          communities: communityIds
        }).fetchAll({withRelated: ['skills', 'organizations']})
      )
    })
    .spread(function (posts, people) {
      res.ok({
        posts_total: getTotal(posts),
        posts: posts && posts.map(PostPresenter.present),
        people_total: getTotal(people),
        people: people && people.map(person => _.chain(person.attributes)
          .pick(UserPresenter.shortAttributes)
          .extend({
            skills: Skill.simpleList(person.relations.skills),
            organizations: Organization.simpleList(person.relations.organizations)
          }).value())
      })
    })
    .catch(res.serverError)
  },

  autocomplete: function (req, res) {
    var term = req.param('q').trim()
    var resultType = req.param('type')
    var sort, method, columns

    switch (resultType) {
      case 'posts':
        method = Search.forPosts
        sort = 'post.created_at'
        break
      case 'skills':
        method = Search.forSkills
        columns = ['skill_name']
        break
      case 'organizations':
        method = Search.forOrganizations
        columns = ['org_name']
        break
      case 'communities':
        method = Search.forCommunities
        columns = ['id', 'name', 'avatar_url', 'slug']
        break
      default:
        method = Search.forUsers
    }

    return (() => {
      if (!_.includes(['skills', 'organizations'], resultType)) {
        return findCommunityIds(req)
        .then(communityIds => ({
          communities: communityIds,
          project: req.param('projectId')
        }))
      }

      return Promise.resolve({})
    })()
    .then(filters => method(_.extend(filters, {
      autocomplete: term,
      limit: req.param('limit') || 5,
      sort: sort
    })).fetchAll({columns: columns}))
    .then(rows => {
      var present
      switch (resultType) {
        case 'posts':
          present = row => row.pick('id', 'name')
          break
        case 'skills':
          present = row => ({name: row.get('skill_name')})
          break
        case 'organizations':
          present = row => ({name: row.get('org_name')})
          break
        default:
          present = row => row.pick('id', 'name', 'avatar_url', 'slug')
      }
      res.ok(rows.map(present))
    })
    .catch(res.serverError)
  },

  showFullText: function (req, res) {
    var term = req.param('q')
    if (!term) return res.badRequest('expected a parameter named "q"')
    var type = req.param('type')
    var limit = req.param('limit')
    var offset = req.param('offset')
    var userId = req.session.userId
    var items

    Membership.activeCommunityIds(userId)
    .then(communityIds =>
      FullTextSearch.searchInCommunities(communityIds, {term, type, limit, offset}))
    .then(items_ => {
      items = items_

      var ids = _.transform(items, (ids, item) => {
        var type = item.post_id ? 'posts'
          : item.comment_id ? 'comments' : 'people'

        if (!ids[type]) ids[type] = []
        var id = item.post_id || item.comment_id || item.user_id
        ids[type].push(id)
      }, {})

      var userColumns = q => q.column('id', 'name', 'avatar_url')

      // FIXME factor out this general-purpose object display/formatting code

      return Promise.join(
        ids.posts && Post.where('id', 'in', ids.posts)
        .fetchAll({withRelated: PostPresenter.relations(userId)}),

        ids.comments && Comment.where('id', 'in', ids.comments)
        .fetchAll({withRelated: [
          {'user': userColumns},
          {'post': q => q.column('id', 'type', 'name', 'user_id')},
          {'post.user': userColumns},
          {'post.relatedUsers': userColumns}
        ]}),

        ids.people && User.where('id', 'in', ids.people)
        .fetchAll({withRelated: ['skills', 'organizations']})
      )
    })
    .spread((posts, comments, people) => items.map(item => {
      var result = {rank: item.rank}

      if (item.user_id) {
        result.type = 'person'
        var person = people.find(p => p.id === item.user_id)
        result.data = UserPresenter.presentForList(person)
      } else if (item.post_id) {
        result.type = 'post'
        var post = posts.find(p => p.id === item.post_id)
        result.data = PostPresenter.present(post)
      } else {
        result.type = 'comment'
        var comment = comments.find(c => c.id === item.comment_id)
        result.data = comment.toJSON()
      }

      return result
    }))
    .then(results => ({items: results, total: _.get(items, '0.total') || 0}))
    .then(res.ok)
  }
}
