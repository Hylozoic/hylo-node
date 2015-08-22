module.exports = function (req, res, next) {

  if (Admin.isSignedIn(req)) return next()

  var communityIds = req.param('communities')
  var userId = req.session.userId

  if (!communityIds) return res.forbidden()

  Membership.query(q => {
    q.whereIn('community_id', communityIds)
    q.where('user_id', userId)
  }).fetchAll()
    // make an object where keys are community ids
    // and values are true if there's a membership or a shared network
    .then(mships => Promise.map(communityIds, id =>
      _.find(mships, m =>
        m.get('community_id') === id || Community.inNetworkWithUser(id, userId))))
    .then(ok => _.all(ok) ? next() : res.forbidden())

}
