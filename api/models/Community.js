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
  },

  moderators: function() {
    return this
      .belongsToMany(User, 'users_community', 'community_id', 'users_id')
      .query({where: {role: Membership.MODERATOR_ROLE}});
  }

}, {

  find: function(id_or_slug) {
    if (isNaN(Number(id_or_slug))) {
      return Community.where({slug: id_or_slug}).fetch();
    }
    return Community.where({id: id_or_slug}).fetch();
  },

  members: function(communityId, term, limit, offset) {
    if (!limit) limit = 10;
    if (!offset) offset = 0;

    return Community.find(communityId).then(function(community) {
      return community.users().query(function(qb) {
        if (term) {
          qb.where("name", "ILIKE", '%' + term + '%');
        }

        qb.limit(limit);
        qb.offset(offset);
      }).fetch();
    })
  }

});
