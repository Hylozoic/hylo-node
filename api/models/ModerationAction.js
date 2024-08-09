/* eslint-disable camelcase */

import { pick } from 'lodash/fp'

module.exports = bookshelf.Model.extend({
  tableName: 'moderation_actions',
  requireFetch: false,
  hasTimestamps: true,

  agreements: function () {
    return this.belongsToMany(Agreement, 'moderation_actions_agreements', 'moderation_action_id', 'agreement_id')
  },

  group: function () {
    return this.belongsTo(Group, 'group_id')
  },

  groupId: function () {
    return this.get('group_id')
  },

  anonymous: function () {
    return this.get('anonymous')
  },

  platformAgreements: function () {
    return this.belongsToMany(PlatformAgreement, 'moderation_actions_platform_agreements', 'moderation_action_id', 'platform_agreement_id')
  },

  post: function () {
    return this.belongsTo(Post, 'post_id')
  },

  reporter: function () {
    return this.belongsTo(User, 'reporter_id')
  },

}, {
  create: async function (data, opts) {
    const { agreements, anonymous, platformAgreements, postId, groupId, reporterId, text } = data

    const modAction = await ModerationAction.forge({ anonymous, post_id: postId, reporter_id: reporterId, text, status: 'active', groupId })
      .save(null, pick(opts, 'transacting'))
    await modAction.platformAgreements().attach(platformAgreements)
    await modAction.agreements().attach(agreements)
    await Post.addToFlaggedGroups({ postId, groupId })
    return modAction
  },

  clearAction: async function ({ postId, groupId, moderationActionId }) {
    let action
    try {
      action = await ModerationAction.where({ id: moderationActionId }).fetch()
      await action.save({ status: 'cleared' }, { patch: true })
    } catch (error) {
      throw new Error('Moderation action not found')
    }
    await Post.removeFromFlaggedGroups({ postId, groupId })
    return action
  }
})
