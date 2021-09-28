import bcrypt from 'bcrypt'
import Promise from 'bluebird'
import { get, isEmpty, merge, pick } from 'lodash'
const hash = Promise.promisify(bcrypt.hash, bcrypt)

module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',
  requireFetch: false,

  user: function () {
    return this.belongsTo(User)
  },

  activeUser: function () {
    return this.belongsTo(User).query({where: {'users.active': true}})
  },

  updatePassword: function (password, { transacting } = {}) {
    return hash(password, 10)
    .then(provider_user_id =>
      this.save({provider_user_id}, {patch: true, transacting}))
  }

}, {
  create: function (userId, { type, profile, password, token }, { transacting, updateUser } = {}) {
    return (() =>
      type === 'password'
        ? hash(password, 10)
        : Promise.resolve(null))()
    .then(hashed => new LinkedAccount({
      provider_key: type,
      provider_user_id: hashed || token || profile.id,
      user_id: userId
    }).save({}, {transacting}))
    .tap(() => updateUser &&
      this.updateUser(userId, {type, profile, transacting}))
  },

  tokenForUser: function (userId) {
    return LinkedAccount.where({
      provider_key: 'token',
      user_id: userId
    }).fetch()
  },

  updateUser: function (userId, { type, profile, transacting } = {}) {
    return User.find(userId, {transacting})
    .then(user => {
      var avatarUrl = user.get('avatar_url')
      var attributes = this.socialMediaAttributes(type, profile)
      if (avatarUrl && !avatarUrl.match(/gravatar/)) {
        attributes.avatar_url = avatarUrl
      }
      if (!isEmpty(attributes)) {
        const q = User.query().where('id', userId)
        if (transacting) {
          q.transacting(transacting)
        }
        return q.update(attributes)
      }
      return false
    })
  },

  socialMediaAttributes: function (type, profile) {
    switch (type) {
      case 'facebook':
        return {
          facebook_url: profile.profileUrl || get(profile, '_json.link'),
          avatar_url: `https://graph.facebook.com/${profile.id}/picture?type=large&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_CLIENT_TOKEN}`
        }
      case 'linkedin':
        return {
          linkedin_url: profile._json.publicProfileUrl,
          avatar_url: get(profile, 'photos.0.value')
        }
    }
    return {}
  }
})
