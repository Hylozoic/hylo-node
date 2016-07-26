
module.exports = bookshelf.Model.extend({
  tableName: 'financial_request',

  post: function () {
    return this.belongsTo(Post)
  }
}, {

  createForPost: function (post_id, amount, trx) {
    return new FinancialRequest({
      created_at: new Date(),
      post_id,
      amount
    }).save(null, {transacting: trx})
  }
})
