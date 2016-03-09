var _ = require('lodash')
var createCheckFreshnessAction = require('../../lib/freshness').createCheckFreshnessAction
var sortColumns = {
  'fulfilled-last': 'fulfilled_at',
  'top': 'post.num_votes',
  'recent': 'post.updated_at',
  'suggested': 'suggested',
  'start_time': ['post.start_time', 'asc']
}

var queryPosts = function (req, opts) {
  var params = _.merge(
    _.pick(req.allParams(), [
      'sort', 'limit', 'offset', 'type', 'start_time', 'end_time', 'filter'
    ]),
    _.pick(opts, 'sort')
  )

  // using Promise.props here allows us to pass queries as attributes,
  // e.g. when looking up communities in PostController.findForUser

  return Promise.props(_.merge(
    {
      sort: sortColumns[params.sort || 'recent'],
      forUser: req.session.userId,
      term: req.param('search')
    },
    _.pick(params, 'type', 'limit', 'offset', 'start_time', 'end_time', 'filter'),
    _.pick(opts, 'communities', 'project', 'users', 'visibility')
  ))
  .then(args => {
    return Search.forPosts(args)
  })
}

var fetchAndPresentPosts = function (query, userId, relationsOpts) {
  return query.fetchAll({
    withRelated: PostPresenter.relations(userId, relationsOpts || {})
  })
  .then(PostPresenter.mapPresentWithTotal)
}

var queryForCommunity = function (req, res) {
  if (TokenAuth.isAuthenticated(res)) {
    if (!RequestValidation.requireTimeRange(req, res)) return
  }

  return queryPosts(req, {
    communities: [res.locals.community.id],
    visibility: (res.locals.membership.dummy ? Post.Visibility.PUBLIC_READABLE : null)
  })
}

var queryForUser = function (req, res) {
  return queryPosts(req, {
    users: [req.param('userId')],
    communities: Membership.activeCommunityIds(req.session.userId),
    visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
  })
}

var queryForAllForUser = function (req, res) {
  return Membership.activeCommunityIds(req.session.userId)
  .then(function (communityIds) {
    return Search.forPosts({
      communities: communityIds,
      limit: req.param('limit') || 10,
      offset: req.param('offset'),
      sort: sortColumns[req.param('sort') || 'recent'],
      type: req.param('type') || 'all+welcome',
      forUser: req.session.userId,
      term: req.param('search')
    })
  })
}

var queryForFollowed = function (req, res) {
  return Promise.resolve(Search.forPosts({
    follower: req.session.userId,
    limit: req.param('limit') || 10,
    offset: req.param('offset'),
    sort: 'post.updated_at',
    type: 'all+welcome',
    term: req.param('search')
  }))
}

var queryForProject = function (req, res) {
  return queryPosts(req, {
    project: req.param('projectId'),
    sort: 'fulfilled-last'
  })
}

var queryForNetwork = function (req, res) {
  return Network.find(req.param('networkId'))
  .then(network => Community.where({network_id: network.id}).fetchAll())
  .then(communities => queryPosts(req, {
    communities: communities.map(c => c.id),
    visibility: [Post.Visibility.DEFAULT, Post.Visibility.PUBLIC_READABLE]
  }))
}

var createFindAction = (queryFunction, relationsOpts) => (req, res) => {
  return queryFunction(req, res)
  .then(query => fetchAndPresentPosts(query, req.session.userId, relationsOpts))
  .then(res.ok, res.serverError)
}

var setupNewPostAttrs = function (userId, params) {
  var attrs = _.merge(Post.newPostAttrs(), {
    name: RichText.sanitize(params.name),
    description: RichText.sanitize(params.description),
    user_id: userId,
    visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT
  }, _.pick(params, 'type', 'start_time', 'end_time', 'location'))

  if (params.projectId) {
    return Project.find(params.projectId)
    .then(project => {
      if (project && project.isDraft()) attrs.visibility = Post.Visibility.DRAFT_PROJECT
      return attrs
    })
  }

  return Promise.resolve(attrs)
}

var afterSavingPost = function (post, opts) {
  var userId = post.get('user_id')
  var mentioned = RichText.getUserMentions(post.get('description'))
  var followerIds = _.uniq(mentioned.concat(userId))

  // no need to specify community ids explicitly if saving for a project
  return (() => {
    if (opts.communities) return Promise.resolve(opts.communities)
    return Project.find(opts.projectId, _.pick(opts, 'transacting')).then(p => [p.get('community_id')])
  })()
  .then(communities => Promise.all(_.flatten([
    // Attach post to communities
    communities.map(id =>
      new Community({id: id}).posts().attach(post.id, _.pick(opts, 'transacting'))),

    // Add mentioned users and creator as followers
    post.addFollowers(followerIds, userId, _.pick(opts, 'transacting')),

    // create activity and send notification to all mentioned users except the creator
    Promise.map(_.without(mentioned, userId), mentionedUserId =>
      Post.notifyAboutMention(post, mentionedUserId, _.pick(opts, 'transacting'))),

    // Add image, if any
    opts.imageUrl && Media.createImageForPost(post.id, opts.imageUrl, opts.transacting),

    opts.docs && Promise.map(opts.docs, doc =>
      Media.createDoc(post.id, doc, opts.transacting)),

    Queue.classMethod('Post', 'sendPushNotifications', {postId: post.id}),

    opts.projectId && PostProjectMembership.create(
      post.id, opts.projectId, _.pick(opts, 'transacting')),

    opts.projectId && Queue.classMethod('Project', 'notifyAboutNewPost', {
      projectId: opts.projectId,
      postId: post.id,
      exclude: mentioned
    })
  ])))
}

var PostController = {
  findOne: function (req, res) {
    res.locals.post.load(PostPresenter.relations(req.session.userId))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError)
  },

  create: function (req, res) {
    return setupNewPostAttrs(req.session.userId, req.allParams())
    .tap(attrs => {
      if (!attrs.name) throw new Error("title can't be blank")
      if (!attrs.type) throw new Error("type can't be blank")
    })
    .then(attrs => bookshelf.transaction(trx =>
      Post.create(attrs, {transacting: trx})
      .tap(post =>
        afterSavingPost(post, {
          communities: req.param('communities'),
          imageUrl: req.param('imageUrl'),
          docs: req.param('docs'),
          projectId: req.param('projectId'),
          transacting: trx
        }))))
    .then(post => post.load(PostPresenter.relations(req.session.userId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(err => {
      if (err.message === "title can't be blank") {
        res.status(422)
        res.send(err.message)
      } else {
        res.serverError(err)
      }
    })
  },

  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostCreationAddress(req.param('To'))
    } catch (e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')))
    }

    var allParams = _.assign(req.allParams(), {'type': replyData.type})
    allParams.name = allParams['subject']
    allParams.description = allParams['stripped-text']

    return setupNewPostAttrs(replyData.userId, allParams)
    .then(attrs => bookshelf.transaction(trx =>
      new Post(attrs).save(null, {transacting: trx})
      .tap(post => afterSavingPost(post, {
        communities: [replyData.communityId],
        imageUrl: req.param('imageUrl'),
        docs: req.param('docs'),
        transacting: trx
      }))))
    .then(() => res.ok({}), res.serverError)
  },

  follow: function (req, res) {
    var userId = req.session.userId
    var post = res.locals.post
    Follow.query().where({user_id: userId, post_id: post.id}).count()
    .then(function (rows) {
      if (Number(rows[0].count) > 0 || req.param('force') === 'unfollow') {
        return post.removeFollower(userId, {createActivity: true})
        .then(() => res.ok({}))
      }

      return post.addFollowers([userId], userId, {createActivity: true})
      .then(() => User.find(req.session.userId))
      .then(user => res.ok(_.pick(user.attributes, 'id', 'name', 'avatar_url')))
    })
    .catch(res.serverError)
  },

  update: function (req, res) {
    var post = res.locals.post
    var params = req.allParams()

    var attrs = _.extend(
      _.pick(params, 'name', 'description', 'type', 'start_time', 'end_time', 'location'),
      {
        updated_at: new Date(),
        visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT
      }
    )

    return bookshelf.transaction(function (trx) {
      return post.save(attrs, {patch: true, transacting: trx})
      .tap(() => {
        var newIds = req.param('communities').sort()
        var oldIds = post.relations.communities.pluck('id').sort()
        if (newIds !== oldIds) {
          return Promise.join(
            Promise.map(_.difference(newIds, oldIds), id =>
              post.communities().attach(id, {transacting: trx})),
            Promise.map(_.difference(oldIds, newIds), id =>
              post.communities().detach(id, {transacting: trx}))
          )
        }
      })
      .tap(() => {
        var mediaParams = ['docs', 'removedDocs', 'imageUrl', 'imageRemoved']
        var isSet = _.partial(_.has, params)
        if (_.some(mediaParams, isSet)) return post.load('media')
      })
      .tap(function () {
        if (!params.imageUrl && !params.imageRemoved) return
        var media = post.relations.media.find(m => m.get('type') === 'image')

        if (media && params.imageRemoved) { // remove media
          return media.destroy({transacting: trx})
        } else if (media) { // replace url in existing media
          if (media.get('url') !== params.imageUrl) {
            return media.save({url: params.imageUrl}, {patch: true, transacting: trx})
            .then(media => media.updateDimensions({patch: true, transacting: trx}))
          }
        } else if (params.imageUrl) { // create new media
          return Media.createImageForPost(post.id, params.imageUrl, trx)
        }
      })
      .tap(() => {
        if (!params.removedDocs) return
        return Promise.map(params.removedDocs, doc => {
          var media = post.relations.media.find(m => m.get('url') === doc.url)
          if (media) return media.destroy({transacting: trx})
        })
      })
      .tap(() => {
        if (!params.docs) return
        return Promise.map(params.docs, doc => {
          var media = post.relations.media.find(m => m.get('url') === doc.url)
          if (!media) return Media.createDoc(post.id, doc, trx)
        })
      })
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  fulfill: function (req, res) {
    bookshelf.transaction(function (trx) {
      return res.locals.post.save({
        fulfilled_at: new Date()
      }, {patch: true, transacting: trx})
      .tap(function () {
        return Promise.map(req.param('contributors'), function (userId) {
          return new Contribution({
            post_id: res.locals.post.id,
            user_id: userId,
            date_contributed: new Date()
          }).save(null, {transacting: trx})
        })
      })
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  vote: function (req, res) {
    var post = res.locals.post

    post.votes().query({where: {user_id: req.session.userId}}).fetchOne()
    .then(vote => bookshelf.transaction(trx => {
      var inc = delta => () => Post.query().where('id', post.id).increment('num_votes', delta).transacting(trx)

      return (vote
        ? vote.destroy({transacting: trx}).then(inc(-1))
        : new Vote({
          post_id: res.locals.post.id,
          user_id: req.session.userId
        }).save().then(inc(1)))
    }))
    .then(() => res.ok({}), res.serverError)
  },

  destroy: function (req, res) {
    return bookshelf.transaction(function (trx) {
      // FIXME this post will still be accessible via activity about a comment
      return Promise.join(
        Activity.where('post_id', res.locals.post.id).destroy({transacting: trx}),
        res.locals.post.save({active: false}, {patch: true, transacting: trx})
      )
    })
    .then(() => res.ok({}), res.serverError)
  },

  complain: function (req, res) {
    var post = res.locals.post

    User.find(req.session.userId)
    .then(user => Email.sendRawEmail('hello@hylo.com', {
      subject: 'Objectionable content report',
      body: format(
        '%s &lt;%s&gt; has flagged %s as objectionable',
        user.get('name'), user.get('email'),
        Frontend.Route.post(post)
      )
    }))
    .then(() => res.ok({}), res.serverError)
  },

  respond: function (req, res) {
    var userId = req.session.userId
    var post = res.locals.post
    var response = req.param('response')

    EventResponse.query(qb => {
      qb.where({user_id: userId, post_id: post.id})
      qb.orderBy('created_at', 'desc')
    }).fetch()
    .then(eventResponse => {
      if (eventResponse) {
        if (eventResponse.get('response') === response) {
          return eventResponse.destroy()
        } else {
          return eventResponse.save({response: response}, {patch: true})
        }
      } else {
        return EventResponse.create(post.id, {responderId: userId, response: response})
      }
    })
    .then(() => res.ok({}), res.serverError)
  }
}

var queries = {
  Community: queryForCommunity,
  User: queryForUser,
  AllForUser: queryForAllForUser,
  Followed: queryForFollowed,
  Project: queryForProject,
  Network: queryForNetwork
}

var relationsOpts = {
  Project: {fromProject: true}
}

_.forEach(queries, (queryFunction, key) => {
  PostController['checkFreshnessFor' + key] = createCheckFreshnessAction(queryFunction, 'posts')
  PostController['findFor' + key] = createFindAction(queryFunction, relationsOpts[key])
})

module.exports = PostController
