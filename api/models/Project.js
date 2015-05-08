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
    return this.get('visibility') === Post.Visibility.PUBLIC;
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
  }

});