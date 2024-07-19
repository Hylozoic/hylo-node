module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_to_group_join_request_question_answers',
  requireFetch: false,
  hasTimestamps: true,

  question () {
    return this.belongsTo(Question)
  },

  joinRequest () {
    return this.belongsTo(GroupRelationshipInvite, 'join_request_id')
  }

}), {

})
