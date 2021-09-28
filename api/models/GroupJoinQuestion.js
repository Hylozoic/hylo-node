module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_join_questions',
  requireFetch: false,
  hasTimestamps: true,

  group () {
    return this.belongsTo(Group)
  },

  question () {
    return this.belongsTo(Question)
  }

}), {

})
