import { get } from 'lodash/fp'

const userColumns = q => q.column('id', 'name', 'avatar_url')

const findCommunityIds = req => {
  if (req.param('communityId')) {
    return Promise.resolve([req.param('communityId')])
  } else if (req.param('type') === 'communities' && req.param('moderated')) {
    if (Admin.isSignedIn(req)) {
      return Community.query().pluck('id')
    } else {
      return Membership.activeCommunityIds(req.session.userId, true)
    }
  } else {
    return Promise.join(
      Network.activeCommunityIds(req.session.userId),
      Membership.activeCommunityIds(req.session.userId)
    ).then(ids => _(ids).flatten().uniq().value())
  }
}

module.exports = {
  autocomplete: function (req, res) {
    var term = req.param('q').trim()
    var resultType = req.param('type')
    var sort, method, columns

    switch (resultType) {
      case 'posts':
        method = Search.forPosts
        sort = 'post.created_at'
        break
      case 'communities':
        method = Search.forCommunities
        columns = ['id', 'name', 'avatar_url', 'slug']
        break
      case 'tags':
        method = Search.forTags
        columns = ['tags.id', 'name']
        break
      default:
        method = Search.forUsers
        if (term.startsWith('@')) {
          term = term.slice(1)
        } else if (term.startsWith('#')) {
          method = Search.forTags
          term = term.slice(1)
        }
    }

    return findCommunityIds(req)
    .then(ids => method({
      communities: ids,
      autocomplete: term,
      limit: req.param('limit') || 10,
      sort: sort
    }).fetchAll({columns: columns}))
    .then(rows => rows.map(row => row.pick('id', 'name', 'avatar_url', 'slug')))
    .then(res.ok)
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

    return Membership.activeCommunityIds(userId)
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

      return Promise.join(
        ids.posts && Post.where('id', 'in', ids.posts).fetchAll({
          withRelated: PostPresenter.relations(userId)
        }),

        ids.comments && Comment.where('id', 'in', ids.comments).fetchAll({
          withRelated: [
            {'user': userColumns},
            {'post': q => q.column('id', 'type', 'name', 'user_id')},
            {'post.user': userColumns},
            {'post.relatedUsers': userColumns},
            {'thanks.thankedBy': userColumns}
          ]
        }),

        ids.people && User.where('id', 'in', ids.people).fetchAll({
          withRelated: 'tags'
        }),

        (posts, comments, people) =>
          items.map(formatResult(posts, comments, people))
      )
    })
    .then(results => ({items: results, total: get('0.total', items) || 0}))
    .then(res.ok)
  }
}

const formatResult = (posts, comments, people) => item => {
  var result = {rank: item.rank}

  if (item.user_id) {
    result.type = 'person'
    const person = people.find(p => p.id === item.user_id)
    result.data = UserPresenter.presentForList(person)
  } else if (item.post_id) {
    result.type = 'post'
    const post = posts.find(p => p.id === item.post_id)
    result.data = PostPresenter.present(post)
  } else {
    result.type = 'comment'
    const comment = comments.find(c => c.id === item.comment_id)
    result.data = comment.toJSON()
  }

  return result
}
