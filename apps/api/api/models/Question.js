module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'questions',
  requireFetch: false,
  hasTimestamps: ['created_at', null],

  answers () {
    return this.hasMany(GroupJoinQuestionAnswer)
  },

  groups () {
    return this.hasMany(Group).through(GroupJoinQuestion)
  }

}), {

})
