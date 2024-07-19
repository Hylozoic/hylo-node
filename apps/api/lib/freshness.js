var checkFreshness = function (newPosts, cachedPosts) {
  var difference = _.differenceBy(newPosts, cachedPosts, 'id')
  return difference.length
}

var createCheckFreshnessAction = (queryFunction, itemType) => (req, res) => {
  return queryFunction(req, res)
  .then(query => query.fetchAll())
  .then(items => checkFreshness(items.models, req.param(itemType)))
  .then(count => res.ok({count}))
}

module.exports = {
  createCheckFreshnessAction: createCheckFreshnessAction,
  checkFreshness: checkFreshness
}
