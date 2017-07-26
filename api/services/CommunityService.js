module.exports = {
  removeMember: (userToRemoveId, communityId, loggedInUserId) => {
    return Membership.query().where({
      user_id: userToRemoveId,
      community_id: communityId
    }).update({
      active: false,
      deactivated_at: new Date(),
      deactivator_id: loggedInUserId
    })
    .then(() => Community.query().where('id', communityId)
      .decrement('num_members')
    )
  }
}
