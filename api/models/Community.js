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
      }).leftJoin('post_community', function() {
        this.on('post_community.post_id', '=', 'comment.post_id');
      })
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
      return community.users().query(function(qb) {
        if (options.search) {
          qb.where("name", "ILIKE", '%' + options.search + '%');
        }
        qb.where("users.active", "=", true);

        qb.limit(options.limit);
        qb.offset(options.offset);
      }).fetch(_.pick(options, 'withRelated'));
    })
  }

});
