module.exports = {
  async removeMember (userToRemoveId, groupId) {
    const group = await Group.find(groupId)
    const user = await User.find(userToRemoveId)
    await user.leaveGroup(group, true)
  }
}
