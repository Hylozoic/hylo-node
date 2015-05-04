var crypto = require('crypto');

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

    var project = new Project(attrs);

    project.save().then(function() {
      res.ok(_.pick(project.toJSON(), 'slug'));
    })
    .catch(res.serverError.bind(res));
  },

  update: function(req, res) {
    var project = res.locals.project;
    project.save(
      _.merge(_.pick(req.allParams(), editableAttributes), {updated_at: new Date()}),
      {patch: true}
    ).then(function() {
      res.ok(_.pick(project.toJSON(), 'slug'));
    })
    .catch(res.serverError.bind(res));
  },

  find: function(req, res) {
    Project.find(res.locals.project.id, {withRelated: [
      {user: function(qb) { qb.column('id', 'name', 'avatar_url') }},
      {community: function(qb) { qb.column('id', 'name', 'avatar_url') }}
    ]}).then(function(project) {
      res.ok(project);
    })
    .catch(res.serverError.bind(res));
  }

};