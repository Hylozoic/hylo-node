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
  },

  // this is a workaround for the absence of an id column on this table.
  // perhaps it is possible to override the default implementation of #destroy
  // instead of creating a method with a different name.
  destroyMe: function() {
    return this.where(_.pick(this.attributes, 'users_id', 'community_id')).destroy();
  }

}, {

  DEFAULT_ROLE: 0,
  MODERATOR_ROLE: 1,

  find: function(user_id, community_id_or_slug) {

    var fetch = function(community_id) {
      return Membership.where({
        users_id: user_id,
        community_id: community_id
      }).fetch();
    };

    if (isNaN(Number(community_id_or_slug))) {
      return Community.find(community_id_or_slug)
      .then(function(community) {
        if (community) return fetch(community.id);
      });
    }

    return fetch(community_id_or_slug);
  },

  setModeratorRole: function(user_id, community_id) {
    return bookshelf.knex('users_community').where({
      users_id: user_id,
      community_id: community_id
    }).update({role: Membership.MODERATOR_ROLE});
  },

  removeModeratorRole: function(user_id, community_id) {
    return bookshelf.knex('users_community').where({
      users_id: user_id,
      community_id: community_id
    }).update({role: Membership.DEFAULT_ROLE});
  },

  // do all of the users have at least one community in common?
  inSameCommunity: function(user_ids) {
    user_ids = _.uniq(user_ids);
    return bookshelf.knex
      .select('community_id')
      .count('*')
      .from('users_community')
      .whereIn('users_id', user_ids)
      .groupBy('community_id')
      .havingRaw('count(*) = ?', [user_ids.length])
      .then(function(sharedMemberships) {
        // the number of rows is equal to the number
        // of communities the users have in common
        return sharedMemberships.length > 0;
      });
  },

  activeCommunityIds: function(user_id) {
    return bookshelf.knex.select("community_id")
      .from("users_community")
      .where("users_id", "=", user_id)
      .where("active", "=", true);
  }

});
