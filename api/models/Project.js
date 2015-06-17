module.exports = bookshelf.Model.extend({
  tableName: 'projects',

  user: function() {
    return this.belongsTo(User);
  },

  community: function() {
    return this.belongsTo(Community);
  },

  posts: function() {
    return this.belongsToMany(Post, 'posts_projects');
  },

  contributors: function() {
    return this.belongsToMany(User, 'projects_users');
  },

  memberships: function() {
    return this.hasMany(ProjectMembership);
  },

  isDraft: function() {
    return !this.get('published_at');
  },

  isPublic: function() {
    return this.get('visibility') === Project.Visibility.PUBLIC;
  },

  setThumbnailUrl: function() {
    return this.generateThumbnailUrl().then(url => {
      this.set('thumbnail_url', url);
      return this;
    });
  }

}, {

  Visibility: {
    COMMUNITY: 0,
    PUBLIC: 1
  },

  find: function(id_or_slug, options) {
    if (isNaN(Number(id_or_slug)) || id_or_slug.match(/a-z/)) {
      return Project.where({slug: id_or_slug}).fetch(options);
    }
    return Project.where({id: id_or_slug}).fetch(options).catch(err => {
      if (err.message && err.message.contains('invalid input syntax for integer')) {
        return Project.where({slug: id_or_slug}).fetch(options);
      }
      throw err;
    });
  },

  generateThumbnailUrl: Promise.method(function(videoUrl) {
    if (!videoUrl || videoUrl === '') return;

    if (videoUrl.match(/youtu\.?be/)) {
      var videoId = videoUrl.match(/(youtu.be\/|embed\/|\?v=)([A-Za-z0-9\-]+)/)[2];
      return format('http://img.youtube.com/vi/%s/hqdefault.jpg', videoId);

    } else if (videoUrl.match(/vimeo/)) {
      var videoId = videoUrl.match(/vimeo\.com\/(\d+)/)[1],
        request = Promise.promisify(require('request'));
      return request(format('http://vimeo.com/api/v2/video/%s.json', videoId))
      .spread((response, body) => JSON.parse(body)[0].thumbnail_large);
    }
  }),

  isVisibleToUser: function(projectId, userId) {
    return Project.find(projectId).then(project => {
      if (project.get('user_id') === userId) return true;

      return ProjectMembership.find(userId, projectId).then(pm => !!pm);
    });
  },

  notifyAboutNewPost: function(opts) {
    return Promise.join(
      Project.find(opts.projectId, {withRelated: [
        {contributors: qb => qb.where('notify_on_new_posts', true)},
        'user'
      ]}),
      Post.find(opts.postId, {withRelated: ['communities']})
    ).spread((project, post) => {
      var creator = project.relations.user,
        community = post.relations.communities.first();

      return project.relations.contributors.map(user => {
        if (_.contains(opts.exclude, user.id)) return;

        return Email.sendNewProjectPostNotification(user.get('email'), {
          creator_profile_url: Frontend.Route.profile(creator),
          creator_avatar_url: creator.get('avatar_url'),
          creator_name: creator.get('name'),
          project_title: project.get('title'),
          project_url: Frontend.Route.project(project),
          project_settings_url: Frontend.Route.projectSettings(project),
          post_title: post.get('name'),
          post_description: post.get('description'),
          post_type: post.get('type'),
          post_url: Frontend.Route.post(post, community)
        });
      });
    });
  }

});