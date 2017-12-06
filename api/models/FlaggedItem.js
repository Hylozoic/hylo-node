import { values, isEmpty, trim } from 'lodash'
import { validateFlaggedItem } from 'hylo-utils/validators'
import { sendMessageFromAxolotl } from '../services/MessagingService'

module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  getObject: function () {
    if (!this.get('object_id')) throw new Error('No object_id defined for Flagged Item')
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Post.find(this.get('object_id'), {withRelated: 'communities'})
      case FlaggedItem.Type.COMMENT:
        return Comment.find(this.get('object_id'), {withRelated: 'post.communities'})
      case FlaggedItem.Type.MEMBER:
        return User.find(this.get('object_id'), {withRelated: 'communities'})
      default:
        throw new Error('Unsupported type for Flagged Item', this.get('object_type'))
    }
  },

  async getMessageText (community) {
    const link = await this.getContentLink(community)
    return `${this.relations.user.get('name')} flagged a ${this.get('object_type')} in ${community.get('name')} for being ${this.get('category')} \n` +
      `Message: ${this.get('reason')}\n` +
      `${link}`
  },

  async getContentLink (community) {
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Frontend.Route.post(this.get('object_id'), community)
      case FlaggedItem.Type.COMMENT:
        const comment = await this.getObject()
        return Frontend.Route.comment(comment, community)
      case FlaggedItem.Type.MEMBER:
        return Frontend.Route.profile(this.get('object_id'))
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
      case FlaggedItem.Type.COMMENT:
        return notifyModeratorsComment(flaggedItem)
      case FlaggedItem.Type.MEMBER:
        return notifyModeratorsMember(flaggedItem)
      default:
        throw new Error('Unsupported type for Flagged Item', flaggedItem.get('object_type'))
    }
  }
})

async function notifyModeratorsPost (flaggedItem) {
  const post = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  return sendToCommunities(flaggedItem, communities)
}

async function notifyModeratorsComment (flaggedItem) {
  const comment = await flaggedItem.getObject()
  const post = comment.relations.post
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  return sendToCommunities(flaggedItem, communities)
}

async function notifyModeratorsMember (flaggedItem) {
  const member = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithUser(member)
  return sendToCommunities(flaggedItem, communities)
}

async function sendToCommunities (flaggedItem, communities) {
  return communities.map(c =>
    c.load('moderators')
    .then(() => flaggedItem.getMessageText(c))
    .then(messageText => {
      const moderatorIds = c.relations.moderators.map('id')
      sendMessageFromAxolotl(moderatorIds, messageText)
    }))
}
