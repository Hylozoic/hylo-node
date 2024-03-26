module.exports = bookshelf.Model.extend({
  tableName: 'proposal_options',
  requireFetch: false,
  post: function () {
    return this.belongsTo(Post, 'post_id')
  }
}, {

})
