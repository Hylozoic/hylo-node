var crypto = require('crypto'),
  marked = require('marked');

var placeholderSlug = function() {
  return crypto.randomBytes(3).toString('hex');
};

var editableAttributes = [
  'community_id', 'title', 'intention', 'details', 'video_url', 'image_url', 'visibility'
];

var projectAttributes = project => _.extend(project.toJSON(), {
  contributor_count: project.relations.contributors.length,
  open_request_count: project.relations.posts.length
});

module.exports = {

  create: function(req, res) {
    console.log(JSON.stringify(req.allParams(), null, 2));

    var attrs = _.defaults(
      _.pick(req.allParams(), editableAttributes),
      {
        title: 'New Project',
        slug: placeholderSlug(),
        created_at: new Date(),
        user_id: req.session.userId
      }
    );

    Promise.method(function() {
      if (attrs.video_url) {
        return Project.generateThumbnailUrl(attrs.video_url)
        .then(url => attrs.thumbnail_url = url);
      }
    })()
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

    Promise.method(function() {
      if (updatedAttrs.video_url) {
        return Project.generateThumbnailUrl(updatedAttrs.video_url)
        .then(url => updatedAttrs.thumbnail_url = url);
      }
    })()
    .then(() => project.save(_.merge(updatedAttrs, {updated_at: new Date()}), {patch: true}))
    .then(() => res.ok(_.pick(project.toJSON(), 'slug', 'published_at')))
    .catch(res.serverError);
  },

  find: function(req, res) {
    Project.query(qb => {
      if (req.param('context') == 'mine') {
        qb.where('user_id', req.session.userId);
      } else {
        throw format('unknown context: %s', req.param('context'));
      }
    }).fetchAll({
      withRelated: [
        {user: qb => qb.column('id', 'name', 'avatar_url')},
        {community: qb => qb.column('id', 'name', 'avatar_url')},
        {contributors: qb => qb.column('users.id')},
        {posts: qb => {
          qb.column('post.id');
          qb.where('type', Post.Type.REQUEST);
        }}
      ]
    })
    .then(projects => projects.map(projectAttributes))
    .then(res.ok)
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
      sort: 'post.last_updated',
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
    var invited = req.param('emails').map(email => { return {email: email} }),
      projectId = req.param('projectId'),
      user, project;

    marked.setOptions({
      gfm: true,
      breaks: true
    });

    var message = marked(req.param('message') || '');

    Promise.join(
      User.find(req.session.userId),
      Project.find(projectId)
    ).spread((user_, project_) => {
      user = user_;
      project = project_;
      return bookshelf.transaction(trx => {
        return User.where('id', 'in', req.param('users')).fetchAll()
        .tap(users => {
          invited = invited.concat(users.map(u => { return {email: u.get('email'), id: u.id} }));
          return Promise.map(invited, person => ProjectInvitation.create(projectId, {
            userId: person.id,
            email: person.email,
            transacting: trx
          }));
        });
      });
    })
    .then(() => Promise.map(invited, person => Email.sendProjectInvitation(person.email, {
      subject: req.param('subject'),
      message: message,
      inviter_name: user.get('name'),
      inviter_email: user.get('email'),
      invite_link: Frontend.Route.project(project)
    })))
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  join: function(req, res) {
    ProjectMembership.create(req.session.userId, req.param('projectId'))
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  removeUser: function(req, res) {
    ProjectMembership.where({
      user_id: req.param('userId'),
      project_id: req.param('projectId')
    }).destroy().then(() => res.ok({}))
    .catch(res.serverError);
  }

};