var heredoc = require('heredoc')

var createCommunityJoinRequest = function (userId, communityId) {
  return bookshelf.transaction(function (trx) {
    var query = heredoc.strip(function() {/*
      INSERT INTO community_join_request (user_id, community_id, created_at)
      VALUES (?, ?, now())
    */})
    return bookshelf.knex.raw(query, [userId, communityId])
  })
}

module.exports = {
  // Find all the join requests for communities moderated by the logged in user.
  findForModerator: function (req, res) {
    var moderatorId = req.session.userId;
    var query = heredoc.strip(function() {/* 
     SELECT cjr.id, cjr.user_id, cjr.community_id
       FROM users_community uc
       LEFT JOIN community_join_request cjr
       ON(cjr.community_id = uc.community_id)
       WHERE uc.role = ?
       AND uc.user_id = ?
    */})
    return bookshelf.knex.raw(query, [Membership.MODERATOR_ROLE, moderatorId])
    .then(data => JSON.stringify(data.rows))
    .then(res.ok, res.serverError)
  },

  create: function (req, res) {
    var userId = req.session.userId
    var communityId = req.param('communityId')
    return createCommunityJoinRequest(userId, communityId)
    .then(() => CommunityJoinRequest.find(userId, communityId))
    .then(res.ok, res.serverError)
  },

  accept: function (req, res) {
    // In a transaction:
    //   Add the user to the community.
    //   Delete the join request.
    var joinRequestId = req.param('joinRequestId')
		return bookshelf.transaction(trx => {
      return CommunityJoinRequest.where({ id: joinRequestId })
      .fetchAll({withRelated: ['user', 'community']})
      .then(cjrs => cjrs.map(cjr => cjr.relations.user.joinCommunity(cjr.relations.community)))
      .then(() => bookshelf.knex.raw('DELETE FROM community_join_request WHERE id = ?', [joinRequestId]))
      .then(res.ok, res.serverError)
		})
  },

  reject: function (req, res) {
    // Delete the join request.
    return CommunityJoinRequest.where({
      id: req.param('joinRequestId'),
    }).destroy()
    .then(res.ok)
    .catch(res.serverError);
  }

}

