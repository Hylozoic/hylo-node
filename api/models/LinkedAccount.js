module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',

  user: function() {
    return this.belongsTo(User);
  },

  activeUser: function() {
    return this.belongsTo(User)
      .query({where: {active: true}});
  }

}, {

  forUserWithPassword: function(user, password) {
    return new LinkedAccount({
      provider_key: 'password',
      provider_user_id: password,
      user_id: user.id
    });
  }

});
