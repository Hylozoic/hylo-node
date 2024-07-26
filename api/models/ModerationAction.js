/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'moderation_actions',
  requireFetch: false,
  hasTimestamps: true,

  agreements: function () {
    return this.belongsToMany(Agreement, 'moderation_actions_agreements', 'moderation_action_id', 'agreement_id')
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
  create: async function ({ userId, data }) {
    // TODO COMOD to implement
    // don't forget to include updating the posts flagged_groups
  },
  clearAction: async function ({ userId, postId, groupId }) {
    // TODO COMOD to implement
    // don't forget to include updating the posts flagged_groups
  }
}, {

})
