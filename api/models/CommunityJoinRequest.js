var heredoc = require('heredoc')

module.exports = bookshelf.Model.extend({
  tableName: 'community_join_request',

  user: function() {
    return this.belongsTo(User, 'user_id')
  },

  community: function() {
    return this.belongsTo(Community, 'community_id')
  },
}, {
  findForUserAndCommunity: function(userId, communityId, options) {
    if (!Number(userId)) {
      throw 'userId ' + userId + ' is not a positive integer in CommunityJoinRequest.find'
    }
    if (!Number(communityId)) {
      throw 'communityId ' + communityId + ' is not a positive integer in CommunityJoinRequest.find'
    }
    var query = heredoc.strip(function() {/*
      SELECT id, user_id, community_id, created_at
      FROM community_join_request
      WHERE user_id = ?
      AND community_id = ?
    */})
    return bookshelf.knex.raw(query, [userId, communityId])
    .then(data => data.rowCount == 0 ? null : data.rows[0])
  }
})

