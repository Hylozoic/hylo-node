module.exports = bookshelf.Model.extend({
  tableName: 'saved_searches',

  community: function () {
    return this.belongsTo(Community)
  },

  network: function () {
    return this.belongsTo(Network)
  }
}, {
  delete: async function(id) {
    await SavedSearch.query().where({ id }).update({ active: false })
    return id;
  }
})
