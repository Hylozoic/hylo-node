
module.exports = bookshelf.Model.extend({
  tableName: 'financial_request',

  post: function () {
    return this.belongsTo(Post)
  }
}, {

  createForPost: function (post_id, amount, projectIssueId, projectOfferId, syndicateIssueId, syndicateOfferId, trx) {
    return new FinancialRequest({
      created_at: new Date(),
      post_id,
      amount,
      project_issue_id: projectIssueId,
      project_offer_id: projectOfferId,
      syndicate_issue_id: syndicateIssueId,
      syndicate_offer_id: syndicateOfferId
    }).save(null, {transacting: trx})
  }
})
