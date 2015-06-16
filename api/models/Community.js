module.exports = bookshelf.Model.extend({
  tableName: 'community',

  inactiveUsers: () => this.belongsToMany(User, 'users_community', 'community_id', 'users_id')
                       .query({where: {'users_community.active': false}}),
  invitations:   () => this.hasMany(Invitation),
  leader:        () => this.belongsTo(User, 'leader_id'),
  memberships:   () => this.hasMany(Membership).query({where: {'users_community.active': true}}),
  moderators:    () => this.belongsToMany(User, 'users_community', 'community_id', 'users_id')
                       .query({where: {role: Membership.MODERATOR_ROLE}}),
  network:       () => this.belongsTo(Network),
  posts:         () => this.belongsToMany(Post, 'post_community', 'community_id', 'post_id')
                       .query({where: {'post.active': true}}),
  users:         () => this.belongsToMany(User, 'users_community', 'community_id', 'users_id')
                       .query({where: {'users_community.active': true}}),

  comments: function() {
    // FIXME get this to use the model relation API
    // instead of the Collection API so that the use
    // of fetch vs. fetchAll isn't confusing.
    // as it is now, it uses "fetchAll" when all the
    // other relations use "fetch"
    var communityId = this.id;
    return Comment.query(function(qb) {
      qb.where({
        'post_community.community_id': communityId,
        'comment.active': true
      }).leftJoin('post_community', function() {
        this.on('post_community.post_id', '=', 'comment.post_id');
      });
    });
  },

  isNewContentPublic: function() {
    return this.get('default_public_content') && this.get('allow_public_content');
  }

}, {

  find: function(id_or_slug, options) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug}).fetch(options);
    }
    return Community.where({id: id_or_slug}).fetch(options);
  },

  canInvite: function(userId, communityId) {
    return Community.find(communityId).then(function(community) {
      if (community.get('settings').all_can_invite) return true;
      return Membership.hasModeratorRole(userId, communityId);
    });
  },

  copyAssets: function(opts) {
    return Community.find(opts.communityId).then(c => Promise.join(
      AssetManagement.copyAsset(c, 'community', 'avatar_url'),
      AssetManagement.copyAsset(c, 'community', 'banner_url')
    ));
  }

});
