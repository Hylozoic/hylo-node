module.exports = bookshelf.Model.extend({
  tableName: 'posts_projects',

  post: function() {
    return this.belongsTo(Post);
  },

  project: function() {
    return this.belongsTo(Project);
  }

}, {

  create: function(postId, projectId, options) {
    return new this({
      post_id: postId,
      project_id: projectId,
      created_at: new Date(),
      updated_at: new Date()
    }).save({}, _.pick(options, 'transacting'));
  }

});