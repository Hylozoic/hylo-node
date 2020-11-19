const checkFreshness = function (newPosts, cachedPosts) {
  const difference = _.differenceBy(newPosts, cachedPosts, "id");
  return difference.length;
};

const createCheckFreshnessAction = (queryFunction, itemType) => (req, res) => {
  return queryFunction(req, res)
    .then((query) => query.fetchAll())
    .then((items) => checkFreshness(items.models, req.param(itemType)))
    .then((count) => res.ok({ count }));
};

module.exports = {
  createCheckFreshnessAction: createCheckFreshnessAction,
  checkFreshness: checkFreshness,
};
