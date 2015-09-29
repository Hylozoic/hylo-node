var sortColumns = {
  'fulfilled-last': 'fulfilled_at',
  'top': 'post.num_votes',
  'recent': 'post.updated_at',
  'suggested': 'suggested'
}

var findPosts = function (req, res, opts) {
  var params = _.merge(
    _.pick(req.allParams(), ['sort', 'limit', 'offset', 'type', 'start_time', 'end_time']),
    _.pick(opts, 'sort')
  )

  Promise.props({
    communities: opts.communities,
    project: opts.project,
    users: opts.users,
    type: params.type,
    limit: params.limit,
    offset: params.offset,
    start_time: params.start_time,
    end_time: params.end_time,
    visibility: opts.visibility,
    sort: sortColumns[params.sort || 'recent'],
    forUser: req.session.userId
  })
  .then(args => Search.forPosts(args).fetchAll({
    withRelated: PostPresenter.relations(req.session.userId, opts.relationsOpts)
  }))
  .then(PostPresenter.mapPresentWithTotal)
  .then(res.ok, res.serverError)
}

var newPostAttrs = function (userId, params) {
  return _.merge(Post.newPostAttrs(), {
    name: RichText.sanitize(params.name),
    description: RichText.sanitize(params.description),
    type: params.type,
    user_id: userId
  })
}

var createImage = function (postId, url, trx) {
  return Media.create({
    post_id: postId,
    url: url,
    type: 'image',
    transacting: trx
  })
}

var createDoc = function (postId, doc, trx) {
  return Media.create({
    post_id: postId,
    url: doc.url,
    type: 'gdoc',
    name: doc.name,
    thumbnail_url: doc.thumbnail_url,
    transacting: trx
  })
}

var afterSavingPost = function (post, opts) {
  var userId = post.get('user_id')
  var mentioned = RichText.getUserMentions(post.get('description'))
  var followerIds = _.uniq(mentioned.concat(userId))

  return Promise.all(_.flatten([
    // Attach post to communities
    opts.communities.map(id => new Community({id: id}).posts().attach(post.id, _.pick(opts, 'transacting'))),

    // Add mentioned users and creator as followers
    post.addFollowers(followerIds, userId, _.pick(opts, 'transacting')),

    // create activity and send notification to all mentioned users except the creator
    Promise.map(_.without(mentioned, userId), mentionedUserId => Post.notifyAboutMention(post, mentionedUserId, _.pick(opts, 'transacting'))),

    // Add image, if any
    (opts.imageUrl && createImage(post.id, opts.imageUrl, opts.transacting)),

    (opts.docs && Promise.map(opts.docs, doc => createDoc(post.id, doc, opts.transacting)))
  ])).then(() => mentioned)
}

module.exports = {
  findOne: function (req, res) {
    res.locals.post.load(PostPresenter.relations(req.session.userId))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError)
  },

  findForUser: function (req, res) {
    findPosts(req, res, {
      users: [req.param('userId')],
      communities: Membership.activeCommunityIds(req.session.userId),
      visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
    })
  },

  findForCommunity: function (req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return
    }

    findPosts(req, res, {
      communities: [req.param('communityId')],
      visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
    })
  },

  findForProject: function (req, res) {
    findPosts(req, res, {
      project: req.param('projectId'),
      relationsOpts: {fromProject: true},
      sort: 'fulfilled-last'
    })
  },

  findForNetwork: function (req, res) {
    Community.where({network_id: req.param('networkId')}).fetchAll()
    .then(communities => {
      findPosts(req, res, {
        communities: communities.map(c => c.id),
        visibility: [Post.Visibility.DEFAULT, Post.Visibility.PUBLIC_READABLE]
      })
    })
  },

  findFollowed: function (req, res) {
    Search.forPosts({
      follower: req.session.userId,
      limit: req.param('limit') || 10,
      offset: req.param('offset'),
      sort: 'post.updated_at',
      type: 'all+welcome'
    }).fetchAll({
      withRelated: PostPresenter.relations(req.session.userId)
    })
    .then(PostPresenter.mapPresentWithTotal)
    .then(res.ok)
    .catch(res.serverError)
  },

  findAllForUser: function (req, res) {
    Membership.activeCommunityIds(req.session.userId)
    .then(function (communityIds) {
      return Search.forPosts({
        communities: communityIds,
        limit: req.param('limit') || 10,
        offset: req.param('offset'),
        sort: sortColumns[req.param('sort') || 'recent'],
        type: req.param('type') || 'all+welcome',
        forUser: req.session.userId
      }).fetchAll({
        withRelated: PostPresenter.relations(req.session.userId)
      })
    })
    .then(PostPresenter.mapPresentWithTotal)
    .then(res.ok)
    .catch(res.serverError)
  },

  create: function (req, res) {
    var attrs = newPostAttrs(req.session.userId, req.allParams())

    return bookshelf.transaction(trx => {
      return new Post(attrs).save(null, {transacting: trx})
      .tap(post => afterSavingPost(post, {
        communities: req.param('communities'),
        imageUrl: req.param('imageUrl'),
        docs: req.param('docs'),
        transacting: trx
      }))
    })
    .then(post => post.load(PostPresenter.relations(req.session.userId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError)
  },

  createForProject: function (req, res) {
    var attrs = newPostAttrs(req.session.userId, req.allParams())
    var projectId = req.param('projectId')

    return Project.find(projectId)
    .tap(project => {
      if (project.isDraft()) attrs.visibility = Post.Visibility.DRAFT_PROJECT
    })
    .then(project => bookshelf.transaction(trx => {
      return new Post(attrs).save(null, {transacting: trx})
      .tap(post => PostProjectMembership.create(post.id, projectId, {transacting: trx}))
      .tap(post => afterSavingPost(post, {
        communities: [req.param('communityId')],
        imageUrl: req.param('imageUrl'),
        transacting: trx
      })
      .then(mentioned => {
        // Send notifications to project contributors
        Queue.classMethod('Project', 'notifyAboutNewPost', {
          projectId: projectId,
          postId: post.id,
          exclude: mentioned
        })
      }))
    }))
    .then(post => post.load(PostPresenter.relations(req.session.userId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError)
  },

  addFollowers: function (req, res) {
    res.locals.post.load('followers').then(function (post) {
      var added = req.param('userIds')
      var existing = post.relations.followers.pluck('user_id')

      return bookshelf.transaction(function (trx) {
        return post.addFollowers(_.difference(added, existing), req.session.userId, {
          transacting: trx,
          createActivity: true
        })
      })
    })
    .then(() => res.ok({}), res.serverError)
  },

  follow: function (req, res) {
    var userId = req.session.userId
    var post = res.locals.post
    Follower.query().where({user_id: userId, post_id: post.id}).count()
    .then(function (rows) {
      if (Number(rows[0].count) > 0 || req.param('force') === 'unfollow') {
        return post.removeFollower(userId, {createActivity: true})
        .then(() => res.ok({}))
      }

      return post.addFollowers([userId], userId, {createActivity: true}).then(function (follows) {
        return User.find(req.session.userId)
      }).then(function (user) {
        res.ok(_.pick(user.attributes, 'id', 'name', 'avatar_url'))
      })
    })
    .catch(res.serverError.bind(res))
  },

  update: function (req, res) {
    var post = res.locals.post
    var params = req.allParams()
    var attrs = _.extend(
      _.pick(params, 'name', 'description', 'type'),
      {edited: true, edited_timestamp: new Date()}
    )

    bookshelf.transaction(function (trx) {
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
        if (_.any(mediaParams, isSet)) return post.load('media')
      })
      .tap(function () {
        if (!params.imageUrl && !params.imageRemoved) return
        var media = post.relations.media.find(m => m.get('type') === 'image')

        if (media && params.imageRemoved) { // remove media
          return media.destroy({transacting: trx})
        } else if (media) { // replace url in existing media
          if (media.get('url') !== params.imageUrl) {
            return media.save({url: params.imageUrl}, {patch: true, transacting: trx})
          }
        } else if (params.imageUrl) { // create new media
          return createImage(post.id, params.imageUrl, trx)
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
          if (!media) return createDoc(post.id, doc, trx)
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
    var community = post.relations.communities.first()

    User.find(req.session.userId)
    .then(user => Email.sendRawEmail('hello@hylo.com', {
      subject: 'Objectionable content report',
      body: format(
        '%s &lt;%s&gt; has flagged %s as objectionable',
        user.get('name'), user.get('email'),
        Frontend.Route.post(post, community)
      )
    }))
    .then(() => res.ok({}), res.serverError)
  }

}
