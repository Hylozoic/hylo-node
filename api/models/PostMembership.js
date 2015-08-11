module.exports = bookshelf.Model.extend({
  tableName: 'post_community',

  post: function() {
    return this.belongsTo(Post);
  },

  community: function() {
    return this.belongsTo(Community);
  }
  
})
