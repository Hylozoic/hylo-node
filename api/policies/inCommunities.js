module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next()

  var communityIds = req.param('community_ids')
  var userId = req.session.userId

  return Membership.query(q => {
    q.whereIn('community_id', communityIds)
    q.where('user_id', userId)
  }).fetchAll()
  .then(mships => Promise.map(communityIds, id =>
    mships.find(m =>
      m.get('community_id') === id || Community.inNetworkWithUser(id, userId))))
  .then(ok => _.every(ok) ? next() : res.forbidden())
}
