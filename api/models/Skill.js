var Promise = require('bluebird'),
  ListModel = require('./abstract/ListModel');

module.exports = bookshelf.Model.extend({
  tableName: 'users_skill',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }

}, {
  simpleList: ListModel.simpleListFn('skill_name'),
  update: ListModel.updateFn('Skill', 'users_skill', 'skill_name')
});