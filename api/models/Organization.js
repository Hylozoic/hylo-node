var ListModel = require('./abstract/ListModel');

module.exports = bookshelf.Model.extend({
  tableName: 'users_org',

  user: function() {
    return this.belongsTo(User, 'users_id');
  }
}, {
  simpleList: ListModel.simpleListFn('org_name'),
  update: ListModel.updateFn('Organization', 'users_org', 'org_name')
})