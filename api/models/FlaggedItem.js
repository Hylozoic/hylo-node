import { values, isEmpty, trim } from 'lodash'
import { validateFlaggedItem } from 'hylo-utils/validators'

module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',

  user: function () {
    return this.belongsTo(User, 'user_id')
  }

}, {
  Category: {
    INAPPROPRIATE: 'inappropriate',
    OFFENSIVE: 'offensive',
    ABUSIVE: 'abusive',
    ILLEGAL: 'illegal',
    OTHER: 'other',
    SAFETY: 'safety',
    SPAM: 'spam'
  },

  create: function (attrs) {
    const { category, link } = attrs

    let { reason } = attrs

    if (!values(this.Category).find(c => category === c)) {
      return Promise.reject('Unknown category.')
    }

    // set reason to 'N/A' if not required (!other) and it's empty.
    if (category !== 'other' && isEmpty(trim(reason))) {
      reason = 'N/A'
    }

    const invalidReason = validateFlaggedItem.reason(reason)
    if (invalidReason) return Promise.reject(invalidReason)

    if (process.env.NODE_ENV !== 'development') {
      const invalidLink = validateFlaggedItem.link(link)
      if (invalidLink) return Promise.reject(invalidLink)
    }

    return this.forge(attrs).save()
  }
})
