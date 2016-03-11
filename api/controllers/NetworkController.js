var updateCommunityIfModerator = (req, communityId, params, trx) =>
  Promise.resolve(Admin.isSignedIn(req) || Membership.hasModeratorRole(req.session.userId, communityId))
  .then(isAllowed => isAllowed &&
    Community.query()
    .where('id', communityId)
    .update(params)
    .transacting(trx))

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

    return bookshelf.transaction(trx => {
      return network.save(null, {transacting: trx})
      .tap(network => Promise.map(req.param('communities'), communityId =>
        updateCommunityIfModerator(req, communityId, {network_id: network.id}, trx)
      ))
    })
    .then(res.ok)
    .catch(res.serverError)
  },

  update: function (req, res) {
    if (!Admin.isSignedIn(req)) {
      res.statusCode = 403
      return res.send('Forbidden')
    }

    var whitelist = [
      'banner_url', 'avatar_url', 'name', 'description', 'slug'
    ]

    // this is currently redundant because of the check at the top, but is here for when network moderators are a thing
    if (Admin.isSignedIn(req)) {
      whitelist.push('slug')
    }

    var attributes = _.pick(req.allParams(), whitelist)

    return bookshelf.transaction(function (trx) {
      return Network.find(req.param('networkId'))
      .then(network => network.save(attributes, {patch: true, transacting: trx}))
      .then(network => {
        var postedComs = req.param('communities')
        return Community.where('network_id', '=', network.id)
        .fetchAll()
        .then(coms => {
          var addedComs = _.difference(postedComs, coms.pluck('id'))
          var removedComs = _.difference(coms.pluck('id'), postedComs)
          return Promise.join(
            Promise.map(addedComs, addedCom =>
              updateCommunityIfModerator(req, addedCom, {network_id: network.id}, trx)),
            Promise.map(removedComs, removedCom =>
              updateCommunityIfModerator(req, removedCom, {network_id: network.id}, trx))
          )
        })
      })
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
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
