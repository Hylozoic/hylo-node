import { values } from 'lodash'
import { validateFlaggedItem } from 'hylo-utils/validators'

module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',

  user: function () {
    return this.belongsTo(User, 'user_id')
  }

}, {
  Category: {
    ABUSIVE: 'abusive',
    ILLEGAL: 'illegal',
    OTHER: 'other',
    SAFETY: 'safety',
    SPAM: 'spam'
  },

  create: function (attrs) {
    const { category, link, reason } = attrs

    if (!values(this.Category).find(c => category === c)) {
      return Promise.reject('Unknown category.')
    }

    const invalidReason = validateFlaggedItem.reason(reason)
    if (invalidReason) Promise.reject(invalidReason)

    const invalidLink = validateFlaggedItem.link(link)
    if (invalidLink) return Promise.reject(invalidLink)

    return this.forge(attrs).save()
  }
})
