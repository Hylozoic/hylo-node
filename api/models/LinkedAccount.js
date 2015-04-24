var bcrypt = require('bcrypt'),
  Promise = require('bluebird'),
  hash = Promise.promisify(bcrypt.hash, bcrypt);

module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',

  user: function() {
    return this.belongsTo(User);
  },

  activeUser: function() {
    return this.belongsTo(User)
      .query({where: {active: true}});
  },

  updatePassword: function(password) {
    var self = this;
    return hash(password, 10).then(function(hashed) {
      return self.save({provider_user_id: hashed}, {patch: true});
    });
  }

}, {

  create: function(userId, data, options) {
    if (!options) options = {};

    return (function() {
      if (data.type === 'password') {
        return hash(data.password, 10);
      }
      return Promise.resolve(null);
    })().then(function(hashed) {
      return new LinkedAccount({
        provider_key: data.type,
        provider_user_id: hashed || data.profile.id,
        user_id: userId
      }).save({}, _.pick(options, 'transacting'));
    });
  }

});
