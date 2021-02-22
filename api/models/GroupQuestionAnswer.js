module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_question_answers',
  requireFetch: false,
  hasTimestamps: true,

  question () {
    return this.belongsTo(GroupQuestion)
  },

  user () {
    return this.belongsTo(User)
  },

}), {

})
