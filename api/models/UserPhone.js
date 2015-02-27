var ListModel = require('./abstract/ListModel');

module.exports = bookshelf.Model.extend({
  tableName: 'phones',

  user: function() {
    return this.belongsTo(User);
  }

}, {
  simpleList: ListModel.simpleListFn('value'),
  update: ListModel.updateFn('UserPhone', 'phones', 'value')
});