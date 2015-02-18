module.exports = bookshelf.Model.extend({

  tableName: 'tours',

  user: function() {
    return this.belongsTo(User);
  }

}, {

});