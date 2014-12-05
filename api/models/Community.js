module.exports = bookshelf.Model.extend({
  tableName: 'community',

  memberships: function() {
    return this.hasMany(Membership);
  },

  users: function() {
    return this.belongsToMany(User, 'users_community', 'community_id', 'users_id');
  },

  invitations: function() {
    return this.hasMany(Invitation);
  },

  posts: function() {
    return this.belongsToMany(Post, 'post_community', 'community_id', 'post_id');
  }

}, {

  find: function(id_or_slug) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug}).fetch();
    }
    return Community.where({id: id_or_slug}).fetch();
  },

});
