var ListModel = require('./abstract/ListModel');

module.exports = bookshelf.Model.extend({
  tableName: 'websites',

  user: function() {
    return this.belongsTo(User);
  }

}, {
  simpleList: ListModel.simpleListFn('value'),
  update: ListModel.updateFn('UserWebsite', 'websites', 'value')
});