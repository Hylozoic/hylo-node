module.exports = function(req, res, next) {

  Network.find(req.param('networkId')).then(network => {
    if (!network) return res.notFound();
    res.locals.network = network;

    return Membership.activeCommunityIds(req.session.userId)
    .then(ids => Network.containsAnyCommunity(network.id, ids))
    .then(isInNetwork => isInNetwork ? next() : res.forbidden());

  })

};