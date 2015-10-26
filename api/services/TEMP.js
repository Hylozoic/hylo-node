// var findPosts = require('./TEMP')
// findPosts().then(args => args.posts[0])


var sortColumns = {
  'fulfilled-last': 'fulfilled_at',
  'top': 'post.num_votes',
  'recent': 'post.updated_at',
  'suggested': 'suggested',
  'start_time': ['post.start_time', 'asc']
}

module.exports = function () {

  var opts = { communities: [ '1121' ], visibility: null }

  var params = _.merge(
    _.pick(opts, 'sort')
  )

  return Promise.props(_.merge(
    {
      sort: sortColumns[params.sort || 'recent'],
      forUser: 11204
    },
    _.pick(params, 'type', 'limit', 'offset', 'start_time', 'end_time', 'filter'),
    _.pick(opts, 'communities', 'project', 'users', 'visibility')
  ))
  .then(args => Search.forPosts(args).fetchAll({
    withRelated: PostPresenter.relations(11204, opts.relationsOpts)
  }))
  .then(PostPresenter.mapPresentWithTotal)
}
