module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
  }

}, {

  create: function (opts) {
    return new Media(_.merge({
      created_at: new Date()
    }, _.pick(opts, 'post_id', 'url', 'type', 'name', 'thumbnail_url')))
    .save(null, _.pick(opts, 'transacting'))
  },

  createImage: function (postId, url, trx) {
    return Media.create({
      post_id: postId,
      url: url,
      type: 'image',
      transacting: trx
    })
  },

  createDoc: function (postId, doc, trx) {
    return Media.create({
      post_id: postId,
      url: doc.url,
      type: 'gdoc',
      name: doc.name,
      thumbnail_url: doc.thumbnail_url,
      transacting: trx
    })
  }

})
