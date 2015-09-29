module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
  }

}, {

  create: function (opts) {
    return new Media(_.pick(opts, 'post_id', 'url', 'type', 'name', 'thumbnail_url'))
    .save(null, _.pick(opts, 'transacting'))
  }

})
