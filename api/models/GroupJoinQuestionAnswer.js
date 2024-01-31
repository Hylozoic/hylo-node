module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_join_questions_answers',
  requireFetch: false,
  hasTimestamps: true,

  group () {
    return this.belongsTo(Group)
  },

  joinRequest () {
    return this.belongsTo(JoinRequest)
  },

  question () {
    return this.belongsTo(Question)
  },

  user () {
    return this.belongsTo(User)
  }

}), {

})
