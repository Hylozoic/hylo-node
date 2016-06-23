var checkFreshness = function (newPosts, cachedPosts) {
  var difference = _.differenceBy(newPosts, cachedPosts, 'id')
  if (difference.length === 0) return false
  return difference.length
}

var createCheckFreshnessAction = (queryFunction, itemType) => (req, res) => {
  return queryFunction(req, res)
  .then(query => query.fetchAll())
  .then(items => checkFreshness(items.models, req.param(itemType)))
  .then(res.ok)
}

module.exports = {
  createCheckFreshnessAction: createCheckFreshnessAction,
  checkFreshness: checkFreshness
}
