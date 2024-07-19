module.exports = bookshelf.Model.extend({
  tableName: 'proposal_votes',
  requireFetch: false,

  option: function () {
    return this.belongsTo(ProposalOption, 'option_id')
  },
  post: function () {
    return this.belongsTo(Post, 'post_id')
  },
  user: function () {
    return this.belongsTo(User, 'user_id')
  }

}, {
  getVoterIdsForPost: function (postId) {
    return this.query(qb => {
      qb.distinct().select('user_id').where('post_id', postId)
    })
  }
})
