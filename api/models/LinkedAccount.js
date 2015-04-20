var bcrypt = require('bcrypt');

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

  createForUserWithPassword: function(user, password, options) {
    var hash = Promise.promisify(bcrypt.hash, bcrypt);
    return hash(password, 10).then(function(hashed) {
      return new LinkedAccount({
        provider_key: 'password',
        provider_user_id: hashed,
        user_id: user.id
      }).save({}, _.pick(options, 'transacting'));
    })
  }

});
