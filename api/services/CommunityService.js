module.exports = {
  async removeMember(userToRemoveId, communityId) {
    const community = await Community.find(communityId);
    const user = await User.find(userToRemoveId);
    await user.leaveCommunity(community);
  },
};
