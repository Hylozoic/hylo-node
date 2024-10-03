module.exports = bookshelf.Model.extend({
  tableName: 'widgets',
  requireFetch: false,
}, {
  fetchAll: async function () {
    let all = await Widget.fetchAll();
    return all
  }
})
