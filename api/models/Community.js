module.exports = bookshelf.Model.extend({
  tableName: 'community',

  memberships: function() {
    return this.hasMany(Membership);
  },

  users: function() {
    return this.belongsToMany(User, 'users_community', 'community_id', 'users_id');
  }

}, {

  withId: function(id) {
    return Community.where({id: id}).fetch();
  }

});