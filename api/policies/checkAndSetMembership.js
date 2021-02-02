module.exports = async function checkAndSetMembership (req, res, next) {
  if (Admin.isSignedIn(req)) return next()
  if (res.locals.publicAccessAllowed) return next()

  const groupId = req.param('groupId')

  // if no group id is specified, continue.
  // this is for routes that can be limited to a specific group
  // or performed across all groups a user can access, e.g. search and
  // getting a user's list of followed tags.
  if (!groupId || groupId === 'all') return next()

  const group = await Group.findActive(groupId)
  if (!group) return res.notFound()
  res.locals.group = group

  const { userId } = req.session
  const membership = await GroupMembership.forPair(userId, group).fetch()
  if (membership) return next()

  // TODO: remove
  // if (community.get('network_id') && req.session.userId) {
  //   const inNetwork = await Network.containsUser(community.get('network_id'), req.session.userId)
  //   if (inNetwork) return next()
  // }

  sails.log.debug(`policy: checkAndSetMembership: fail. user ${req.session.userId}, group ${group.id}`)
  res.forbidden()
}
