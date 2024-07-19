const { GraphQLYogaError } = require('@graphql-yoga/node')

import { values, isEmpty, trim } from 'lodash'
import { Validators } from 'hylo-shared'
import { notifyModeratorsPost, notifyModeratorsMember, notifyModeratorsComment } from './flaggedItem/notifyUtils'

module.exports = bookshelf.Model.extend({
  tableName: 'flagged_items',
  requireFetch: false,

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  getObject: function () {
    if (!this.get('object_id')) throw new GraphQLYogaError('No object_id defined for Flagged Item')
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Post.find(this.get('object_id'), {withRelated: 'groups'})
      case FlaggedItem.Type.COMMENT:
        return Comment.find(this.get('object_id'), {withRelated: 'post.groups'})
      case FlaggedItem.Type.MEMBER:
        return User.find(this.get('object_id'))
      default:
        throw new GraphQLYogaError('Unsupported type for Flagged Item', this.get('object_type'))
    }
  },

  async getMessageText (group) {
    const isPublic = !group ? true : false
    const link = await this.getContentLink(group, isPublic)

    return `${this.relations.user.get('name')} flagged a ${this.get('object_type')} in ${group ? group.get('name') : 'Public'} for being ${this.get('category')}\n` +
      `Message: ${this.get('reason')}\n` +
      `${link}\n\n`
  },

  async getContentLink (group, isPublic) {
    switch (this.get('object_type')) {
      case FlaggedItem.Type.POST:
        return Frontend.Route.post(this.get('object_id'), group, isPublic)
      case FlaggedItem.Type.COMMENT:
        const comment = await this.getObject()
        return Frontend.Route.comment({ comment, groupSlug: group ? group.get('slug') : null })
      case FlaggedItem.Type.MEMBER:
        return Frontend.Route.profile(this.get('object_id'), group)
      default:
        throw new GraphQLYogaError('Unsupported type for Flagged Item', this.get('object_type'))
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
      return Promise.reject(new GraphQLYogaError('Unknown category.'))
    }

    // set reason to 'N/A' if not required (!other) and it's empty.
    if (category !== 'other' && isEmpty(trim(reason))) {
      reason = 'N/A'
    }

    const invalidReason = Validators.validateFlaggedItem.reason(reason)
    if (invalidReason) return Promise.reject(new GraphQLYogaError(invalidReason))

    if (process.env.NODE_ENV !== 'development') {
      const invalidLink = Validators.validateFlaggedItem.link(link)
      if (invalidLink) return Promise.reject(new GraphQLYogaError(invalidLink))
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
        throw new GraphQLYogaError('Unsupported type for Flagged Item', flaggedItem.get('object_type'))
    }
  }
})
