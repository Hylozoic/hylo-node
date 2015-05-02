module.exports = bookshelf.Model.extend({
  tableName: 'projects'

}, {

  Visibility: {
    COMMUNITY: 0,
    PUBLIC: 1
  }

});