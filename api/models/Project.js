module.exports = bookshelf.Model.extend({
  tableName: 'projects'

}, {

  Visibility: {
    COMMUNITY: 0,
    PUBLIC: 1
  },

  find: function(id_or_slug, options) {
    if (isNaN(Number(id_or_slug))) {
      return Project.where({slug: id_or_slug}).fetch(options);
    }
    return Project.where({id: id_or_slug}).fetch(options);
  }

});