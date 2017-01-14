module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  }
}, {

  isRequesterVisible: (viewerId, requesterId) => {
    const moderatedCommunityIds = Membership.query()
    .where({user_id: viewerId, role: Membership.MODERATOR_ROLE})
    .select('community_id')

    return JoinRequest.query()
    .where('user_id', requesterId)
    .where('community_id', 'in', moderatedCommunityIds)
    .count()
    .then(rows => Number(rows[0].count) > 0)
  }
})
