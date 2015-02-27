var ListModel = require('./abstract/ListModel');

module.exports = bookshelf.Model.extend({
  tableName: 'emails',

  user: function() {
    return this.belongsTo(User);
  }

}, {
  simpleList: ListModel.simpleListFn('value'),
  update: ListModel.updateFn('UserEmail', 'emails', 'value')
});