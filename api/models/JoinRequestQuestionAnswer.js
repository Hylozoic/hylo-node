module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'join_request_question_answers',
  requireFetch: false,
  hasTimestamps: true,

  question () {
    return this.belongsTo(Question)
  },

  joinRequest () {
    return this.belongsTo(JoinRequest)
  },

}), {

})
