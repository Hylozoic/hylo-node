module.exports = bookshelf.Model.extend({
  tableName: 'community',

  memberships: function() {
    return this.hasMany(Membership);
  },

  users: function() {
    return this.belongsToMany(User, 'users_community', 'community_id', 'users_id')
      .query({where: {'users_community.active': true}});
  },

  inactiveUsers: function() {
    return this.belongsToMany(User, 'users_community', 'community_id', 'users_id')
      .query({where: {'users_community.active': false}});
  },

  invitations: function() {
    return this.hasMany(Invitation);
  },

  posts: function() {
    return this.belongsToMany(Post, 'post_community', 'community_id', 'post_id')
      .query({where: {'post.active': true}});
  },

  moderators: function() {
    return this
      .belongsToMany(User, 'users_community', 'community_id', 'users_id')
      .query({where: {role: Membership.MODERATOR_ROLE}});
  },

  leader: function() {
    return this.belongsTo(User, 'leader_id');
  },

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
  }

}, {

  find: function(id_or_slug) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug}).fetch();
    }
    return Community.where({id: id_or_slug}).fetch();
  },

  members: function(communityId, options) {
    _.defaults(options, {
      limit: 10,
      offset: 0
    });

    return Community.find(communityId).then(function(community) {
      var opts = _.merge(
        _.pick(options, 'limit', 'offset', 'start_time', 'end_time'),
        {
          term: options.search,
          communities: [communityId]
        }
      );
      return Search.forUsers(opts).fetchAll(_.pick(options, 'withRelated'));
    })
  },

  canInvite: function(userId, communityId) {
    return Community.find(communityId).then(function(community) {
      if (community.get('settings').all_can_invite) return true;
      return Membership.hasModeratorRole(userId, communityId);
    });
  }

});
