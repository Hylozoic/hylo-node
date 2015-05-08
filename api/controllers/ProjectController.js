var crypto = require('crypto'),
  format = require('util').format;

var placeholderSlug = function() {
  return crypto.randomBytes(4).toString('hex');
};

var editableAttributes = [
  'community_id', 'title', 'intention', 'details', 'video_url', 'image_url', 'visibility'
];

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

    new Project(attrs).save()
    .then(project => res.ok(_.pick(project.toJSON(), 'slug')))
    .catch(res.serverError);
  },

  update: function(req, res) {
    var project = res.locals.project,
      updatedAttrs = _.pick(req.allParams(), editableAttributes);

    project.save(_.merge(updatedAttrs, {updated_at: new Date()}), {patch: true})
    .then(() => res.ok(_.pick(project.toJSON(), 'slug')))
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
        {community: qb => qb.column('id', 'name', 'avatar_url')},
        {contributors: qb => qb.column('users.id')},
        {posts: qb => {
          qb.column('post.id');
          qb.where('type', Post.Type.REQUEST);
        }}
      ]
    })
    .then(projects => projects.map(project => _.extend(project.toJSON(), {
      contributor_count: project.relations.contributors.length,
      open_request_count: project.relations.posts.length
    })))
    .then(res.ok)
    .catch(res.serverError);
  },

  findOne: function(req, res) {
    Project.find(res.locals.project.id, {withRelated: [
      {user: qb => qb.column('id', 'name', 'avatar_url')},
      {community: qb => qb.column('id', 'name', 'avatar_url')}
    ]})
    .then(res.ok)
    .catch(res.serverError);
  }

};