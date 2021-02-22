module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_questions',
  requireFetch: false,
  hasTimestamps: true,

  group () {
    return this.belongsTo(Group)
  },

  answers () {
    return this.hasMany(GroupQuestionAnswer)
  },

}), {

})
