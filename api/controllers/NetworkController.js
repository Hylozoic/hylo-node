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
    if (!Admin.isSignedIn(req)) {
      res.statusCode = 403
      return res.end('Forbidden')
    }

    var whitelist = [
      'banner_url', 'avatar_url', 'name', 'description'
    ]

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
            Promise.map(addedComs, addedCom => {
              return Membership.hasModeratorRole(req.session.userId, addedCom)
              .then(isModerator => {
                if (isModerator) {
                  return Community.find(addedCom)
                  .then(c => c.save({network_id: network.id}, {patch: true, transacting: trx}))
                }
                return
              })
            }),
            Promise.map(removedComs, removedCom => {
              return Membership.hasModeratorRole(req.session.userId, removedCom)
              .then(isModerator => {
                if (isModerator) {
                  return Community.find(removedCom)
                  .then(c => c.save({network_id: null}, {patch: true, transacting: trx}))
                }
                return
              })
            })
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
