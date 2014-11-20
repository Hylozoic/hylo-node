module.exports = bookshelf.Model.extend({
  tableName: 'post',

  community: function() {
    return this.belongsToMany(Community, 'post_community', 'post_id', 'community_id');
  }

})