var bcrypt = require('bcrypt')
var Promise = require('bluebird')
var hash = Promise.promisify(bcrypt.hash, bcrypt)

module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',

  user: function () {
    return this.belongsTo(User)
  },

  activeUser: function () {
    return this.belongsTo(User).query({where: {active: true}})
  },

  updatePassword: function (password) {
    return hash(password, 10)
    .then(provider_user_id => this.save({provider_user_id}, {patch: true}))
  }

}, {
  create: function (userId, data, options) {
    if (!options) options = {}

    return (() =>
      data.type === 'password'
        ? hash(data.password, 10)
        : Promise.resolve(null))()
    .then(hashed => new LinkedAccount({
      provider_key: data.type,
      provider_user_id: hashed || data.profile.id,
      user_id: userId
    }).save({}, _.pick(options, 'transacting')))
  }
})
