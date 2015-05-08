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
    if (isNaN(Number(id_or_slug))) {
      return Project.where({slug: id_or_slug}).fetch(options);
    }
    return Project.where({id: id_or_slug}).fetch(options);
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
  })

});