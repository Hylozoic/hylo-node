var validator = require('validator')

module.exports = {
  search: function(req, res) {
    Community.query('whereRaw', "visibility != 'secret'")
    .fetchAll({withRelated: ['memberships']})
    .then(communities => communities.map(c => _.extend(c.pick('id', 'name', 'slug', 'avatar_url', 'banner_url', 'visibility'), {
      memberCount: c.relations.memberships.length
    })))
    .then(communities => _.sortBy(communities, c => -c.memberCount))
    .then(res.ok)
    .catch(res.serverError)
  },

  find: function (req, res) {
    Community.fetchAll({withRelated: [
        {memberships: q => q.column('community_id')}
    ]})
    .then(communities => communities.map(c => _.extend(c.toJSON(), {
      memberships: c.relations.memberships.length
    })))
    .then(res.ok, res.serverError)
  },

  findOne: function (req, res) {
    var community = res.locals.community
    var membership = res.locals.membership

    return Promise.method(() => community.get('network_id') ? community.load('network') : null)()
    .then(() => community.pick('id', 'name', 'slug', 'avatar_url', 'banner_url', 'description', 'settings'))
    .tap(data => {
      var network = community.relations.network
      if (network) data.network = network.pick('id', 'name', 'slug')
    })
    .tap(() => membership && membership.updateViewedAt())
    .then(res.ok)
    .catch(res.serverError)
  },

  findSettings: function (req, res) {
    var leader
    Community.find(req.param('communityId'), {withRelated: ['leader']})
    .tap(community => leader = community.relations.leader)
    .then(community => _.merge(community.pick(
      'welcome_message', 'beta_access_code', 'settings', 'visibility'
    ), {
      leader: leader ? leader.pick('id', 'name', 'avatar_url') : null
    }))
    .then(res.ok)
    .catch(res.serverError)
  },

  update: function (req, res) {
    var whitelist = [
      'banner_url', 'avatar_url', 'name', 'description', 'settings',
      'welcome_message', 'leader_id', 'beta_access_code', 'visibility'
    ]
    var attributes = _.pick(req.allParams(), whitelist)
    var community = new Community({id: req.param('communityId')})

    community.save(attributes, {patch: true})
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  invite: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(function (community) {
      var emails = (req.param('emails') || '').split(',').map(function (email) {
        var trimmed = email.trim()
        var matchLongFormat = trimmed.match(/.*<(.*)>/)

        if (matchLongFormat) return matchLongFormat[1]
        return trimmed
      })

      return Promise.map(emails, function (email) {
        if (!validator.isEmail(email)) {
          return {email: email, error: 'not a valid email address'}
        }

        return Invitation.createAndSend({
          email: email,
          userId: req.session.userId,
          communityId: community.id,
          message: RichText.markdown(req.param('message')),
          moderator: req.param('moderator'),
          subject: req.param('subject')
        }).then(function () {
          return {email: email, error: null}
        }).catch(function (err) {
          return {email: email, error: err.message}
        })
      })
    })
    .then(results => res.ok({results: results}))
  },

  findModerators: function (req, res) {
    Community.find(req.param('communityId')).then(function (community) {
      return community.moderators().fetch()
    }).then(function (moderators) {
      res.ok(moderators.map(function (user) {
        return {
          id: user.id,
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        }
      }))
    })
  },

  addModerator: function (req, res) {
    Membership.setModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeModerator: function (req, res) {
    Membership.removeModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  joinWithCode: function (req, res) {
    var community
    Community.query('whereRaw', 'lower(beta_access_code) = lower(?)', req.param('code')).fetch()
    .tap(c => community = c)
    .tap(() => bookshelf.transaction(trx => Promise.join(
          Membership.create(req.session.userId, community.id, {transacting: trx}),
          Post.createWelcomePost(req.session.userId, community.id, trx)
      )))
    .catch(err => {
      if (err.message && err.message.contains('duplicate key value')) {
        return true
      } else {
        res.serverError(err)
        return false
      }
    })
    // we get here if the membership was created successfully, or if it already existed
    .then(ok => ok && Membership.find(req.session.userId, community.id)
      .then(membership => _.merge(membership.toJSON(), {
        community: community.pick('id', 'name', 'slug', 'avatar_url')
      }))
      .then(res.ok))
  },

  leave: function (req, res) {
    res.locals.membership.destroyMe()
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeMember: function (req, res) {
    Membership.query().where({
      user_id: req.param('userId'),
      community_id: req.param('communityId')
    }).update({
      active: false,
      deactivated_at: new Date(),
      deactivator_id: req.session.userId
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  validate: function (req, res) {
    var allowedColumns = ['name', 'slug', 'beta_access_code']
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
    return Community.query().whereRaw(statement, params.value).count()
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
  },

  create: function (req, res) {
    var attrs = _.pick(req.allParams(),
      'name', 'description', 'slug', 'category',
      'beta_access_code', 'banner_url', 'avatar_url', 'visibility')

    var community = new Community(_.merge(attrs, {
      created_at: new Date(),
      created_by_id: req.session.userId
    }))

    community.set('leader_id', req.session.userId)
    community.set('welcome_message', 'Thank you for joining us here at Hylo. ' +
      'Through our communities, we can find everything we need. If we share ' +
      'with each other the unique gifts and intentions we each have, we can ' +
      "create extraordinary things. Let's get started!")

    return bookshelf.transaction(function (trx) {
      return community.save(null, {transacting: trx})
      .tap(() => Membership.create(req.session.userId, community.id, {
        role: Membership.MODERATOR_ROLE,
        transacting: trx
      }))
    })
    // The assets were uploaded to /community/new, since we didn't have an id
    // copy them over to /community/:id now
    .tap(community => Queue.classMethod('Community', 'copyAssets', {communityId: community.id}))
    .tap(community => Queue.classMethod('Community', 'notifyAboutCreate', {communityId: community.id}))
    .tap(() => Tour.skipOnboarding(req.session.userId))
    // FIXME this additional lookup wouldn't be necessary
    // if we had a Membership instance from the previous
    // step. But the absence of an id column on the table
    // doesn't play nice with Bookshelf.
    .then(() => Membership.find(req.session.userId, community.id, {withRelated: ['community']}))
    .then(res.ok)
    .catch(res.serverError)
  },

  findForNetwork: function (req, res) {
    Community.where('network_id', req.param('networkId'))
    .fetchAll({withRelated: ['memberships']})
    .then(communities => communities.map(c => _.extend(c.pick('id', 'name', 'slug', 'avatar_url', 'banner_url'), {
      memberCount: c.relations.memberships.length
    })))
    .then(communities => _.sortBy(communities, c => -c.memberCount))
    .then(res.ok)
    .catch(res.serverError)
  }

}
