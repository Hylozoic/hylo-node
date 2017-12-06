import { values, isEmpty, trim } from 'lodash'
import { validateFlaggedItem } from 'hylo-utils/validators'
import { sendMessageFromAxolotl } from '../services/MessagingService'

module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  getObject: function (opts) {
    if (!this.get('object_id')) throw new Error('No object_id defined for Flagged Item')
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Post.find(this.get('object_id'), opts)
      default:
        throw new Error('Unsupported type for Flagged Item', this.get('object_type'))
    }
  },

  getMessageText: function (community) {
    return `${this.relations.user.get('name')} flagged a ${this.get('object_type')} in ${community.get('name')} for being ${this.get('category')} \n` +
      `Message: ${this.get('reason')}\n` +
      `${this.getContentLink(community)}`
  },

  getContentLink: function (community) {
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Frontend.Route.post(this.get('object_id'), community)
      default:
        throw new Error('Unsupported type for Flagged Item', this.get('object_type'))
    }
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

  Type: {
    POST: 'post',
    COMMENT: 'comment',
    MEMBER: 'member'
  },

  find (id, opts = {}) {
    return FlaggedItem.where({id})
    .fetch(opts)
  },

  create: function (attrs) {
    const { category, link } = attrs

    let { reason } = attrs

    if (!values(this.Category).find(c => category === c)) {
      return Promise.reject(new Error('Unknown category.'))
    }

    // set reason to 'N/A' if not required (!other) and it's empty.
    if (category !== 'other' && isEmpty(trim(reason))) {
      reason = 'N/A'
    }

    const invalidReason = validateFlaggedItem.reason(reason)
    if (invalidReason) return Promise.reject(new Error(invalidReason))

    if (process.env.NODE_ENV !== 'development') {
      const invalidLink = validateFlaggedItem.link(link)
      if (invalidLink) return Promise.reject(new Error(invalidLink))
    }

    return this.forge(attrs).save()
  },

  async notifyModerators ({ id }) {
    const flaggedItem = await FlaggedItem.find(id, {withRelated: 'user'})
    switch (flaggedItem.get('object_type')) {
      case FlaggedItem.Type.POST:
        return notifyModeratorsPost(flaggedItem)
      default:
        throw new Error('Unsupported type for Flagged Item', flaggedItem.get('object_type'))
    }
  }
})

async function notifyModeratorsPost (flaggedItem) {
  const post = await flaggedItem.getObject({withRelated: 'communities'})
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  communities.map(c => c.load('moderators')
    .then(() => {
      const moderatorIds = c.relations.moderators.map('id')
      sendMessageFromAxolotl(moderatorIds, flaggedItem.getMessageText(c))
    }))
}
