var checkFreshness = function (newPosts, cachedPosts) {
  var difference = _.differenceBy(newPosts, cachedPosts, 'id')
  console.log('checkFreshness', {
    newPosts: newPosts.map(p => _.pick(p, ['id'])),
    cachedPosts: cachedPosts.map(p => _.pick(p, ['id'])),
    difference: difference.map(p => _.pick(p, ['id']))
  })
  return difference.length !== 0
}

var createCheckFreshnessAction = (queryMethod, itemType) => (req, res) => {
  return queryMethod(req, res)
  .then(query => query.fetchAll())
  .then(items => checkFreshness(items.models, req.param(itemType)))
  .then(res.ok)
}

module.exports = {
  createCheckFreshnessAction: createCheckFreshnessAction,
  checkFreshness: checkFreshness
}
