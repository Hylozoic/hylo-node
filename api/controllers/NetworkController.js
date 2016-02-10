module.exports = {

  findOne: function (req, res) {
    res.ok(res.locals.network)
  },

  create: function (req, res) {
    var attrs = _.pick(req.allParams(),
      'name', 'description', 'slug', 'banner_url', 'avatar_url')

    var network = new Network(_.merge(attrs, {
      created_at: new Date()
    }))

    return network.save()
    .tap(network => Promise.map(req.param('communities'), communityId =>
      Membership.hasModeratorRole(req.session.userId, communityId)
      .then(isModerator => {
        if (isModerator) {
          return Community.find(communityId)
          .then(community => community.save({network_id: network.id}))
        }
        return
      })
    ))
    .then(res.ok)
    .catch(res.serverError)
  }
}
