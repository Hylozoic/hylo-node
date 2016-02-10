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

  validate: function (req, res) {
    var allowedColumns = ['name', 'slug']
    var allowedConstraints = ['exists', 'unique']
    var params = _.pick(req.allParams(), 'constraint', 'column', 'value')

    // prevent SQL injection
    if (!_.include(allowedColumns, params.column)) {
      return res.badRequest(format('invalid value "%s" for parameter "column"', params.column))
    }

    if (!params.value) {
      return res.badRequest('missing required parameter "value"')
    }

    if (!_.include(allowedConstraints, params.constraint)) {
      return res.badRequest(format('invalid value "%s" for parameter "constraint"', params.constraint))
    }

    var statement = format('lower(%s) = lower(?)', params.column)
    return Network.query().whereRaw(statement, params.value).count()
    .then(function (rows) {
      var data
      if (params.constraint === 'unique') {
        data = {unique: Number(rows[0].count) === 0}
      } else if (params.constraint === 'exists') {
        var exists = Number(rows[0].count) >= 1
        data = {exists: exists}
      }
      res.ok(data)
    })
    .catch(res.serverError)
  }
}
