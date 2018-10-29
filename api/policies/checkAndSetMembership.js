module.exports = async function checkAndSetMembership (req, res, next) {
  if (Admin.isSignedIn(req)) return next()
  if (res.locals.publicAccessAllowed) return next()

  const communityId = req.param('communityId')
  const networkId = req.param('networkId')

  if (networkId && req.session.userId) {
    const network = await Network.find(networkId, {active: true})
    const inNetwork = await Network.containsUser(network.id, req.session.userId)
    console.log('!!!! in check and set membership', networkId, req.session.userId, network)
    if (inNetwork) {
      res.locals.network = network
      return next()
    }
  }

  // if no community id is specified, continue.
  // this is for routes that can be limited to a specific community
  // or performed across all communities a user can access, e.g. search and
  // getting a user's list of followed tags.
  if (!communityId || communityId === 'all') return next()

  const community = await Community.findActive(communityId)
  if (!community) return res.notFound()
  res.locals.community = community

  const { userId } = req.session
  const membership = await GroupMembership.forPair(userId, community).fetch()
  if (membership) return next()

  if (community.get('network_id') && req.session.userId) {
    const inNetwork = await Network.containsUser(community.get('network_id'), req.session.userId)
    if (inNetwork) return next()
  }

  sails.log.debug(`policy: checkAndSetMembership: fail. user ${req.session.userId}, community ${community.id}`)
  res.forbidden()
}
