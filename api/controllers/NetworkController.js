module.exports = {

  findOne: function (req, res) {
    res.ok(res.locals.network)
    /*
    var network = res.locals.network
    if (req.param('withCommunityIds')) {
      Community.where('network_id', network.get('id'))
      .fetchAll()
      .then(cs =>
        _.extend(network.toJSON(), {communities: cs.map(c => ({id: c.id, name: c.name, avatar_url: c.avatar_url}))}))
      .then(res.ok)
    } else {
      res.ok(network)
    }
    */
  },

  create: function (req, res) {
    var attrs = _.pick(req.allParams(),
      'name', 'description', 'slug', 'banner_url', 'avatar_url')

    var network = new Network(_.merge(attrs, {
      created_at: new Date()
    }))

    return bookshelf.transaction(trx => {
      return network.save(null, {transacting: trx})
      .tap(network => Promise.map(req.param('communities'), communityId =>
        Membership.hasModeratorRole(req.session.userId, communityId)
        .then(isModerator => {
          if (isModerator) {
            return Community.find(communityId)
            .then(community => community.save({network_id: network.id}, {transacting: trx}))
          }
          return
        })
      ))
    })
    .then(res.ok)
    .catch(res.serverError)
  },

  update: function (req, res) {
    var network = res.locals.network
    var params = req.allParams()

    sails.log.debug('Network ', network)
    sails.log.debug('Params ', params)
    return res.ok()
  },

  validate: function (req, res) {
    return Validation.validate(_.pick(req.allParams(), 'constraint', 'column', 'value'),
      Network, ['name', 'slug'], ['exists', 'unique'])
    .then(validation => {
      if (validation.badRequest) {
        return res.badRequest(validation.badRequest)
      } else {
        return res.ok(validation)
      }
    })
    .catch(res.serverError)
  }
}
