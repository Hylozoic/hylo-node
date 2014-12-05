module.exports = bookshelf.Model.extend({
  tableName: 'users_community',

  user: function() {
    return this.belongsTo(User, 'users_id');
  },

  community: function() {
    return this.belongsTo(Community);
  },

  hasModeratorRole: function() {
    return this.get('role') == Membership.MODERATOR_ROLE;
  }

}, {

  DEFAULT_ROLE: 0,
  MODERATOR_ROLE: 1,

  withIds: function(user_id, community_id_or_slug) {

    var fetch = function(community_id) {
      return Membership.where({
        users_id: user_id,
        community_id: community_id
      }).fetch();
    }

    if (isNaN(Number(community_id_or_slug))) {
      return Community.find(community_id_or_slug)
      .then(function(community) {
        return fetch(community.id);
      })
    }

    return fetch(community_id_or_slug);
  }

});