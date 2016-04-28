var ListModel = require('./abstract/ListModel')

module.exports = bookshelf.Model.extend({
  tableName: 'users_skill',

  name: function () {
    return this.get('skill_name')
  },

  user: function () {
    return this.belongsTo(User)
  }

}, {
  simpleList: ListModel.simpleListFn('skill_name'),
  update: ListModel.updateFn('Skill', 'users_skill', 'skill_name')
})
