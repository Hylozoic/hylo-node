module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'questions',
  requireFetch: false,
  hasTimestamps: ['created_at', null],

  groups () {
    return this.hasMany(Groups).through(GroupJoinQuestion)
  },

  joinRequestAnswers () {
    return this.hasMany(JoinRequestQuestionAnswer)
  }

}), {

})
