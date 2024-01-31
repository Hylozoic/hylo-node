/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'users_groups_agreements',
  requireFetch: false,
  hasTimestamps: true,

  agreement: function () {
    return this.belongsTo(Agreement)
  },

  group: function () {
    return this.belongsTo(Group)
  },

  user: function () {
    return this.belongsTo(User)
  }
}, {

  findAndUpdateOrCreate: async function ({ userId, groupId, agreementId, accepted = null }, options) {
    const data = { user_id: userId, group_id: groupId, agreement_id: agreementId }

    let uga = UserGroupAgreement.find(data, options)

    // If we already have this agreement and the accepted value is the same, return it
    if (uga && (accepted === null || accepted === uga.get('accepted'))) return uga

    if (!uga) {
      uga = new UserGroupAgreement({ ...data, accepted })
    }

    uga.save({ accepted }, options)
    return uga
  },
})
