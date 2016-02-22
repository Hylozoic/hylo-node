var slug = require('slug')

var makeSlug = function (title) {
  if (!title || title === 'New Project') return 'untitled'
  return slug(title, {mode: 'rfc3986'})
}

var editableAttributeNames = [
  'community_id', 'title', 'intention', 'details', 'visibility', 'location'
]

var mediaAttributeNames = [
  'image_url', 'thumbnail_url', 'video_url'
]

var projectRelations = [
  {user: qb => qb.column('id', 'name', 'avatar_url')},
  {community: qb => qb.column('id', 'name', 'avatar_url', 'slug')},
  {contributors: qb => qb.column('users.id')},
  {posts: qb => {
    qb.column('post.id')
    qb.where('type', Post.Type.REQUEST)
  }},
  'media'
]

var projectAttributes = function (project, noLegacy) {
  var attrs = project.toJSON()
  _.extend(attrs, {
    contributor_count: project.relations.contributors.length,
    open_request_count: project.relations.posts.length
  }, noLegacy || mediaAttributes(project))
  return attrs
}

var mediaAttributes = function (project) {
  var attrs = {}
  for (var i = 0; i < project.relations.media.length; i++) {
    var media = project.relations.media.models[i]
    if (media && media.get('type') === 'video') {
      _.extend(attrs, {
        video_url: media.get('url'),
        thumbnail_url: media.get('thumbnail_url')
      })
    }
    if (media && media.get('type') === 'image') {
      _.extend(attrs, {
        image_url: media.get('url')
      })
    }
  }
  return attrs
}

var createMedia = function (project, attrs, trx) {
  return Media.where('project_id', project.id)
  .fetchAll({transacting: trx})
  .then(media => Promise.map(media.models, medium => medium.destroy({transacting: trx})))
  .then(() => {
    if (attrs.video_url) {
      return Project.generateThumbnailUrl(attrs.video_url)
      .then(thumbnail_url => Media.createVideoForProject(project.id, attrs.video_url, thumbnail_url, trx))
    }
  })
  .then(() => {
    if (attrs.image_url) {
      return Media.createImageForProject(project.id, attrs.image_url, trx)
    }
  })
}

var searchForProjects = function (res, opts) {
  Search.forProjects(opts)
    .fetchAll({withRelated: projectRelations})
    .then(projects => projects.map(projectAttributes))
    .then(res.ok)
    .catch(res.serverError)
}

module.exports = {
  create: function (req, res) {
    var attrs = _.defaults(
      _.pick(req.allParams(), editableAttributeNames),
      {
        title: 'New Project',
        created_at: new Date(),
        user_id: req.session.userId,
        slug: makeSlug(req.param('title'))
      }
    )

    var mediaAttrs = _.pick(req.allParams(), mediaAttributeNames)

    return bookshelf.transaction(trx => {
      return new Project(attrs).save({}, {transacting: trx})
      .tap(project => createMedia(project, mediaAttrs, trx))
    })
    .then(project => res.ok(_.pick(project.toJSON(), 'id', 'slug')))
    .catch(res.serverError)
  },

  update: function (req, res) {
    var project = res.locals.project
    var updatedAttrs = _.pick(req.allParams(), editableAttributeNames)
    var mediaAttrs = _.pick(req.allParams(), mediaAttributeNames)

    if (req.param('publish')) {
      updatedAttrs.published_at = new Date()
    } else if (req.param('unpublish')) {
      updatedAttrs.published_at = null
    }

    if (_.has(updatedAttrs, 'title')) {
      updatedAttrs.slug = makeSlug(updatedAttrs.title)
    }

    return createMedia(project, mediaAttrs)
    .then(() => {
      return bookshelf.transaction(trx => {
        return project.save(_.merge(updatedAttrs, {updated_at: new Date()}), {patch: true})
        .tap(() => {
          if (!_.has(updatedAttrs, 'published_at')) return
          var vis = Post.Visibility[updatedAttrs.published_at ? 'DEFAULT' : 'DRAFT_PROJECT']

          return project.load('posts')
          .then(() => Post.query().where('id', 'in', project.relations.posts.map('id')).update({visibility: vis}))
        })
      })
    })
    .then(() => res.ok(_.pick(project.toJSON(), 'id', 'slug', 'published_at')))
    .catch(res.serverError)
  },

  findOne: function (req, res) {
    Project.find(res.locals.project.id, {withRelated: [
      {user: qb => qb.column('id', 'name', 'avatar_url')},
      {community: qb => qb.column('id', 'name', 'avatar_url', 'slug')},
      {contributors: qb => qb.column('users.id')},
      {memberships: qb => qb.where('user_id', req.session.userId)},
      {posts: qb => qb.where({fulfilled_at: null, active: true})},
      'media'
    ]})
    .then(project => res.ok(_.merge(_.omit(project.toJSON(), 'posts', 'memberships'), mediaAttributes(project), {
      membership: project.relations.memberships.first(),
      open_request_count: project.relations.posts.length
    })))
    .catch(res.serverError)
  },

  invite: function (req, res) {
    var invited = req.param('emails').map(email => ({email: email}))
    var projectId = req.param('projectId')
    var user, project

    Promise.join(
      User.find(req.session.userId),
      Project.find(projectId)
    ).spread((user_, project_) => {
      user = user_
      project = project_
      return bookshelf.transaction(trx => {
        return User.where('id', 'in', req.param('users')).fetchAll()
        .then(users => {
          invited = invited.concat(users.map(u => ({email: u.get('email'), id: u.id})))
          return Promise.map(invited, person => ProjectInvitation.create(projectId, {
            userId: person.id,
            email: person.email,
            transacting: trx
          }))
        })
      })
    })
    .then(invitations => Promise.map(invitations, inv => Email.sendProjectInvitation(inv.get('email'), {
      subject: req.param('subject'),
      message: RichText.markdown(req.param('message')),
      inviter_name: user.get('name'),
      inviter_email: user.get('email'),
      invite_link: Frontend.Route.project(project) + '?token=' + inv.get('token')
    })))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  join: function (req, res) {
    bookshelf.transaction(trx => Promise.join(
      ProjectInvitation.findByToken(req.param('token')).then(i => i ? i.use(req.session.userId) : null),
      ProjectMembership.create(req.session.userId, req.param('projectId'))
    ))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeUser: function (req, res) {
    ProjectMembership.where({
      user_id: req.param('userId'),
      project_id: req.param('projectId')
    }).destroy().then(() => res.ok({}))
    .catch(res.serverError)
  },

  findForUser: function (req, res) {
    searchForProjects(res, {user: req.param('userId')})
  },

  find: function (req, res) {
    var includePublic = true
    var isMine = req.param('type') === 'mine'
    var publicOnly = !req.session.userId

    ;(() => {
      var communityId = req.param('communityId')
      if (communityId) {
        includePublic = false
        return Community.find(communityId).then(c => [c.id])
      } else {
        return Membership.activeCommunityIds(req.session.userId)
      }
    })()
    .then(communityIds => Search.forProjects({
      community: communityIds,
      includePublic,
      publicOnly,
      published: !isMine,
      limit: req.param('limit') || 20,
      offset: req.param('offset') || 0,
      user: isMine && req.session.userId,
      term: req.param('search')
    }).fetchAll({withRelated: projectRelations}))
    .then(projects => ({
      projects: projects.map(p => projectAttributes(p, true)),
      projects_total: projects.first() ? projects.first().get('total') : 0
    }))
    .then(res.ok, res.serverError)
  },

  findForCommunity: function (req, res) {
    searchForProjects(res, {community: req.param('communityId'), published: true})
  },

  updateMembership: function (req, res) {
    ProjectMembership.query().where({
      user_id: req.param('userId'),
      project_id: req.param('projectId')
    }).update(_.pick(req.allParams(), 'notify_on_new_posts'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  toggleModeratorRole: function (req, res) {
    ProjectMembership.query().where({
      user_id: req.param('userId'),
      project_id: req.param('projectId')
    }).update(_.pick(req.allParams(), 'role'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  }

}
