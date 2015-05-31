var crypto = require('crypto');

var placeholderSlug = function() {
  return crypto.randomBytes(3).toString('hex');
};

var editableAttributes = [
  'community_id', 'title', 'intention', 'details', 'video_url', 'image_url', 'visibility'
];

var projectRelations = [
  {user: qb => qb.column('id', 'name', 'avatar_url')},
  {community: qb => qb.column('id', 'name', 'avatar_url')},
  {contributors: qb => qb.column('users.id')},
  {posts: qb => {
    qb.column('post.id');
    qb.where('type', Post.Type.REQUEST);
  }}
];

var projectAttributes = project => _.extend(project.toJSON(), {
  contributor_count: project.relations.contributors.length,
  open_request_count: project.relations.posts.length
});

var maybeGenerateVideoThumbnail = Promise.method(function(attrs) {
  if (attrs.video_url) {
    return Project.generateThumbnailUrl(attrs.video_url)
    .then(url => attrs.thumbnail_url = url);
  }
});

module.exports = {

  create: function(req, res) {
    var attrs = _.defaults(
      _.pick(req.allParams(), editableAttributes),
      {
        title: 'New Project',
        slug: placeholderSlug(),
        created_at: new Date(),
        user_id: req.session.userId
      }
    );

    maybeGenerateVideoThumbnail(attrs)
    .then(() => new Project(attrs))
    .then(project => project.save())
    .then(project => res.ok(_.pick(project.toJSON(), 'slug')))
    .catch(res.serverError);
  },

  update: function(req, res) {
    var project = res.locals.project,
      updatedAttrs = _.pick(req.allParams(), editableAttributes);

    if (req.param('publish'))
      updatedAttrs.published_at = new Date();
    else if (req.param('unpublish'))
      updatedAttrs.published_at = null;

    maybeGenerateVideoThumbnail(updatedAttrs)
    .then(() => {
      return bookshelf.transaction(trx => {
        return project.save(_.merge(updatedAttrs, {updated_at: new Date()}), {patch: true})
        .tap(() => {
          if (!_.has(updatedAttrs, 'published_at')) return;
          var vis = Post.Visibility[updatedAttrs.published_at ? 'DEFAULT' : 'DRAFT_PROJECT'];

          return project.load('posts')
          .then(() =>
            Post.query().where('id', 'in', project.relations.posts.map('id'))
            .update({visibility: vis}));
        });
      });
    })
    .then(() => res.ok(_.pick(project.toJSON(), 'slug', 'published_at')))
    .catch(res.serverError);
  },

  findOne: function(req, res) {
    Project.find(res.locals.project.id, {withRelated: [
      {user: qb => qb.column('id', 'name', 'avatar_url')},
      {community: qb => qb.column('id', 'name', 'avatar_url')},
      {contributors: qb => qb.where('users.id', req.session.userId)},
      {posts: qb => qb.where('fulfilled', false)}
    ]})
    .then(project => res.ok(_.merge(_.omit(project.toJSON(), 'contributors', 'posts'), {
      is_contributor: project.relations.contributors.length > 0,
      open_request_count: project.relations.posts.length
    })))
    .catch(res.serverError);
  },

  findPosts: function(req, res) {
    Search.forPosts({
      project: req.param('projectId'),
      sort: 'post.last_updated',
      limit: req.param('limit') || 10,
      offset: req.param('offset') || 0
    })
    .fetchAll({withRelated: PostPresenter.relations(req.session.userId, {fromProject: true})})
    .then(PostPresenter.mapPresentWithTotal)
    .then(res.ok)
    .catch(res.serverError);
  },

  findUsers: function(req, res) {
    Search.forUsers({
      project: req.param('projectId'),
      sort: 'users.name',
      limit: req.param('limit') || 10,
      offset: req.param('offset') || 0
    })
    .fetchAll()
    .then(users => users.map(u => u.pick('id', 'name', 'avatar_url', 'bio',
      'twitter_name', 'facebook_url', 'linkedin_url')))
    .then(res.ok)
    .catch(res.serverError);
  },

  invite: function(req, res) {
    var invited = req.param('emails').map(email => ({email: email})),
      projectId = req.param('projectId'),
      user, project;

    Promise.join(
      User.find(req.session.userId),
      Project.find(projectId)
    ).spread((user_, project_) => {
      user = user_;
      project = project_;
      return bookshelf.transaction(trx => {
        return User.where('id', 'in', req.param('users')).fetchAll()
        .then(users => {
          invited = invited.concat(users.map(u => ({email: u.get('email'), id: u.id})));
          return Promise.map(invited, person => ProjectInvitation.create(projectId, {
            userId: person.id,
            email: person.email,
            transacting: trx
          }));
        });
      });
    })
    .then(invitations => Promise.map(invitations, inv =>
      Email.sendProjectInvitation(inv.get('email'), {
        subject: req.param('subject'),
        message: RichText.markdown(req.param('message')),
        inviter_name: user.get('name'),
        inviter_email: user.get('email'),
        invite_link: Frontend.Route.project(project) + '?token=' + inv.get('token')
      })))
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  join: function(req, res) {
    bookshelf.transaction(trx => {
      return Promise.join(
        ProjectInvitation.findByToken(req.param('token')).then(i => i ? i.use(req.session.userId) : null),
        ProjectMembership.create(req.session.userId, req.param('projectId'))
      );
    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  removeUser: function(req, res) {
    ProjectMembership.where({
      user_id: req.param('userId'),
      project_id: req.param('projectId')
    }).destroy().then(() => res.ok({}))
    .catch(res.serverError);
  },

  findForUser: function(req, res) {
    Search.forProjects({user: req.param('userId')})
    .fetchAll({withRelated: projectRelations})
    .then(projects => projects.map(projectAttributes))
    .then(res.ok)
    .catch(res.serverError);
  },

  findForCommunity: function(req, res) {
    Search.forProjects({community: req.param('communityId')})
    .fetchAll({withRelated: projectRelations})
    .then(projects => projects.map(projectAttributes))
    .then(res.ok)
    .catch(res.serverError);
  }

};