import bcrypt from 'bcrypt'
import Promise from 'bluebird'
import { get, isEmpty, merge, pick } from 'lodash'
const hash = Promise.promisify(bcrypt.hash, bcrypt)

module.exports = bookshelf.Model.extend({
  tableName: 'linked_account',

  user: function () {
    return this.belongsTo(User)
  },

  activeUser: function () {
    return this.belongsTo(User).query({where: {active: true}})
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
      return !isEmpty(attributes) && User.query().where('id', userId)
      .update(attributes)
      .transacting(transacting)
    })
  },

  socialMediaAttributes: function (type, profile) {
    var jsonLink = get(profile, '_json.link')
    if (isEmpty(jsonLink)) {
      jsonLink = null
    }
    switch (type) {
      case 'facebook':
        return {
          facebook_url: profile.profileUrl || jsonLink,
          avatar_url: `https://graph.facebook.com/${profile.id}/picture?type=large`
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
