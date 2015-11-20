var GetImageSize = require('../services/GetImageSize')

module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
  },

  project: function () {
    return this.belongsTo(Project)
  },

  updateDimensions: function (opts) {
    var image_url
    if (this.get('type') === 'image') {
      image_url = this.get('url')
    } else if (this.get('type') === 'video') {
      image_url = this.get('thumbnail_url')
    }
    var media = this
    if (image_url) {
      return GetImageSize(image_url)
      .then(dimensions => {
        var attrs = {width: dimensions.width, height: dimensions.height}
        return media.save(attrs, opts)
      })
    }
  }

}, {

  create: function (opts) {
    return new Media(_.merge({
      created_at: new Date()
    }, _.pick(opts, 'post_id', 'project_id', 'url', 'type', 'name', 'thumbnail_url', 'width', 'height')))
    .save(null, _.pick(opts, 'transacting'))
  },

  createImageForPost: function (postId, url, trx) {
    return Media.createAddingWidthAndHeight({
      post_id: postId,
      url: url,
      type: 'image',
      transacting: trx
    })
  },

  createImageForProject: function (projectId, url, trx) {
    return Media.createAddingWidthAndHeight({
      project_id: projectId,
      url: url,
      type: 'image',
      transacting: trx
    })
  },

  createVideoForProject: function (projectId, video_url, thumbnail_url, trx) {
    return Media.createAddingWidthAndHeight({
      project_id: projectId,
      url: video_url,
      thumbnail_url: thumbnail_url,
      type: 'video',
      transacting: trx
    })
  },

  createAddingWidthAndHeight: function (attrs) {
    var image_url
    if (attrs['type'] === 'image') {
      image_url = attrs['url']
    } else if (attrs['type'] === 'video') {
      image_url = attrs['thumbnail_url']
    }
    if (image_url) {
      return GetImageSize(image_url)
      .then(dimensions => {
        attrs = _.extend(attrs, {width: dimensions.width, height: dimensions.height})
        return Media.create(attrs)
      })
    } else {
      return Media.create(attrs)
    }
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
