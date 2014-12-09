// The lack of a single-column primary key on this table turns out to be a real drag,
// because Bookshelf requires one for many purposes, so we have to drop down closer
// to raw SQL to work around that.

module.exports = bookshelf.Model.extend({
  tableName: 'users',

  memberships: function() {
    return this.hasMany(Membership, 'users_id');
  },

  communities: function() {
    return this.belongsToMany(Community, 'users_community', 'users_id', 'community_id');
  },

  linkedAccounts: function() {
    return this.hasMany(LinkedAccount);
  },

  sentInvitations: function() {
    return this.hasMany(Invitation, 'invited_by_id');
  },

  skills: function() {
    return this.hasMany(Skill, 'users_id');
  },

  organizations: function() {
    return this.hasMany(Organization, 'users_id');
  },

  setModeratorRole: function(community) {
    return bookshelf.knex('users_community').where({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community)
    }).update({role: Membership.MODERATOR_ROLE});
  },

  removeModeratorRole: function(community) {
    return bookshelf.knex('users_community').where({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community)
    }).update({role: Membership.DEFAULT_ROLE});
  },

  joinCommunity: function(community) {
    return bookshelf.knex('users_community').insert({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community),
      role: Membership.DEFAULT_ROLE
    });
  }

}, {

  find: function(id) {
    return User.where({id: id}).fetch();
  },

  named: function(name) {
    return User.where({name: name}).fetch();
  }

});