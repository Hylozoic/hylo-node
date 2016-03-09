var validator = require('validator')

var findContext = function (req) {
  var projectId = req.param('projectId')
  if (projectId) {
    return Project.find(projectId).then(project => {
      if (!project) return {}
      if (project.isPublic()) return {project: project}

      return ProjectInvitation.validate(projectId, req.param('projectToken'))
        .then(valid => (valid ? {project: project} : {}))
    })
  }

  if (req.session.invitationId) {
    return Invitation.find(req.session.invitationId, {withRelated: ['community']})
      .then(function (invitation) {
        return {community: invitation.relations.community, invitation: invitation}
      })
  }

  return Promise.props({community: Community.where({beta_access_code: req.param('code')}).fetch()})
}

var setupReputationQuery = function (req, model) {
  var params = _.pick(req.allParams(), 'userId', 'limit', 'start')
  var isSelf = req.session.userId === params.userId

  return Promise.method(function () {
    if (!isSelf) return Membership.activeCommunityIds(req.session.userId)
  })()
  .then(communityIds =>
    model.queryForUser(params.userId, communityIds).query(q => {
      q.limit(params.limit || 15)
      q.offset(params.start || 0)
    }))
}

module.exports = {
  create: function (req, res) {
    var params = _.pick(req.allParams(), 'name', 'email', 'password')

    return findContext(req)
    .then(ctx => {
      var attrs = _.merge(_.pick(params, 'name', 'email'), {
        community: (ctx.invitation ? null : ctx.community),
        account: {type: 'password', password: params.password}
      })

      return User.createFully(attrs, ctx.invitation)
    })
    .tap(user => req.param('login') && UserSession.login(req, user, 'password'))
    .then(user => {
      if (req.param('resp') === 'user') {
        return UserPresenter.fetchForSelf(user.id, Admin.isSignedIn(req))
        .then(attributes => UserPresenter.presentForSelf(attributes, req.session))
        .then(res.ok)
      } else {
        return res.ok({})
      }
    })
    .catch(function (err) {
      res.status(422).send(err.detail ? err.detail : err)
    })
  },

  status: function (req, res) {
    res.ok({signedIn: UserSession.isLoggedIn(req)})
  },

  findSelf: function (req, res) {
    return UserPresenter.fetchForSelf(req.session.userId, Admin.isSignedIn(req))
    .then(attributes => UserPresenter.presentForSelf(attributes, req.session))
    .then(res.ok)
    .catch(err => {
      if (err === 'User not found') return res.ok({})
      throw err
    })
    .catch(res.serverError)
  },

  findOne: function (req, res) {
    UserPresenter.fetchForOther(req.param('userId'))
    .then(res.ok)
    .catch(res.serverError)
  },

  contributions: function (req, res) {
    return setupReputationQuery(req, Contribution)
    .then(q => q.fetchAll({
      withRelated: [
        {post: q => q.column('id', 'name', 'user_id', 'type')},
        {'post.user': q => q.column('id', 'name', 'avatar_url')},
        {'post.communities': q => q.column('community.id', 'name')}
      ]
    }))
    .then(res.ok, res.serverError)
  },

  thanks: function (req, res) {
    return setupReputationQuery(req, Thank)
    .then(q => q.fetchAll({
      withRelated: [
        {thankedBy: q => q.column('id', 'name', 'avatar_url')},
        {comment: q => q.column('id', 'text', 'post_id')},
        {'comment.post.user': q => q.column('id', 'name', 'avatar_url')},
        {'comment.post': q => q.column('post.id', 'name', 'user_id', 'type')},
        {'comment.post.communities': q => q.column('community.id', 'name')}
      ]
    }))
    .then(res.ok, res.serverError)
  },

  update: function (req, res) {
    var attrs = _.pick(req.allParams(), [
      'name', 'bio', 'avatar_url', 'banner_url', 'twitter_name', 'linkedin_url', 'facebook_url',
      'email', 'send_email_preference', 'work', 'intention', 'extra_info',
      'new_notification_count', 'push_follow_preference', 'push_new_post_preference', 'settings'
    ])

    return User.find(req.param('userId'))
    .tap(function (user) {
      var newEmail = attrs.email
      var oldEmail = user.get('email')
      if (newEmail && newEmail !== oldEmail) {
        if (!validator.isEmail(newEmail)) {
          throw new Error('invalid-email')
        }
        return User.isEmailUnique(newEmail, oldEmail).then(function (isUnique) {
          if (!isUnique) throw new Error('duplicate-email')
        })
      }
    })
    .then(function (user) {
      // FIXME this should be in a transaction

      user.setSanely(attrs)

      var promises = []
      var changed = false

      _.each([
        ['skills', Skill],
        ['organizations', Organization],
        ['phones', UserPhone],
        ['emails', UserEmail],
        ['websites', UserWebsite]
      ], function (model) {
        var param = req.param(model[0])
        if (param) {
          promises.push(model[1].update(_.flatten([param]), user.id))
          changed = true
        }
      })

      if (!_.isEmpty(user.changed) || changed) {
        promises.push(user.save(
          _.extend({updated_at: new Date()}, user.changed),
          {patch: true}
        ))
      }

      if (attrs.new_notification_count === 0) {
        promises.push(user.resetNotificationCount())
      }

      var newPassword = req.param('password')
      if (newPassword) {
        promises.push(
          LinkedAccount.where({user_id: user.id, provider_key: 'password'}).fetch()
            .then(function (account) {
              if (account) return account.updatePassword(newPassword)
              return LinkedAccount.create(user.id, {type: 'password', password: newPassword})
            })
        )
      }

      return Promise.all(promises)
    })
    .then(() => res.ok({}))
    .catch(function (err) {
      if (_.includes(['invalid-email', 'duplicate-email'], err.message)) {
        res.statusCode = 422
        res.send(req.__(err.message))
      } else {
        res.serverError(err)
      }
    })
  },

  sendPasswordReset: function (req, res) {
    var email = req.param('email')
    User.where('email', email).fetch().then(function (user) {
      if (!user) {
        res.ok({error: 'no user'})
      } else {
        user.generateToken().then(function (token) {
          Queue.classMethod('Email', 'sendPasswordReset', {
            email: user.get('email'),
            templateData: {
              login_url: Frontend.Route.tokenLogin(user, token)
            }
          })
          res.ok({})
        })
      }
    })
    .catch(res.serverError.bind(res))
  },

  findForProject: function (req, res) {
    var total

    res.locals.project.contributors()
    .query(qb => {
      qb.limit(req.param('limit') || 10)
      qb.offset(req.param('offset') || 0)
      qb.orderBy('projects_users.created_at', 'desc')
      qb.select(bookshelf.knex.raw('users.*, count(*) over () as total'))
    })
    .fetch({withRelated: ['skills', 'organizations']})
    .tap(users => total = (users.length > 0 ? users.first().get('total') : 0))
    .then(users => users.map(u => _.extend(UserPresenter.presentForList(u), {membership: u.pivot.pick('role')})))
    .then(users => {
      if (req.param('paginate')) {
        return {people_total: total, people: users}
      } else {
        return users
      }
    })
    .then(res.ok, res.serverError)
  },

  findForCommunity: function (req, res) {
    if (TokenAuth.isAuthenticated(res) &&
      !RequestValidation.requireTimeRange(req, res)) return

    var options = _.defaults(
      _.pick(req.allParams(), 'limit', 'offset', 'start_time', 'end_time'),
      {
        limit: 20,
        communities: [res.locals.community.id],
        term: req.param('search')
      }
    )
    var total

    Search.forUsers(options).fetchAll({withRelated: ['skills', 'organizations', 'memberships']})
    .tap(users => total = (users.length > 0 ? users.first().get('total') : 0))
    .then(users => users.map(u => UserPresenter.presentForList(u, res.locals.community.id)))
    .then(list => ({people_total: total, people: list}))
    .then(res.ok, res.serverError)
  },

  findForNetwork: function (req, res) {
    var total

    Network.find(req.param('networkId'))
    .then(network => Community.query().where('network_id', network.id).select('id'))
    .then(rows => _.map(rows, 'id'))
    .then(ids => Search.forUsers({
      communities: ids,
      limit: req.param('limit') || 20,
      offset: req.param('offset') || 0
    }).fetchAll({withRelated: ['skills', 'organizations']}))
    .tap(users => total = (users.length > 0 ? users.first().get('total') : 0))
    .then(users => users.map(UserPresenter.presentForList))
    .then(list => ({people_total: total, people: list}))
    .then(res.ok, res.serverError)
  },

  findForPostVote: function (req, res) {
    User.query(q => {
      q.where('id', 'in', Vote.query()
        .where({post_id: req.param('postId')})
        .select('user_id'))
    })
    .fetchAll()
    .then(people => people.map(u => u.pick('id', 'name', 'avatar_url')))
    .then(people => ({people, people_total: people.length}))
    .then(res.ok, res.serverError)
  }
}
