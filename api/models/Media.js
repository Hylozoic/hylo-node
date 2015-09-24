module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
  }

}, {

  create: function (opts) {
    return new Media({
      post_id: opts.postId,
      url: opts.url,
      type: opts.type
    }).save(null, _.pick(opts, 'transacting'))
  }

})
