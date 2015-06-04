module.exports = bookshelf.Model.extend({
  tableName: 'networks',

  communities: () => this.hasMany(Community)

}, {

});