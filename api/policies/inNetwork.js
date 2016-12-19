module.exports = function(req, res, next) {

  Network.find(req.param('networkId')).then(network => {
    if (!network) return res.notFound();
    res.locals.network = network;

    if (Admin.isSignedIn(req)) return next();

    return Network.containsUser(network.id, req.session.userId)
    .then(contains => contains ? next() : res.forbidden());
  });

};
