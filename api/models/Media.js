var GetImageSize = require('../services/GetImageSize')
import request from 'request'
import { merge } from 'lodash'
import { pick } from 'lodash/fp'

module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
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
    }, _.pick(opts, 'post_id', 'url', 'type', 'name', 'thumbnail_url', 'width', 'height')))
    .save(null, _.pick(opts, 'transacting'))
  },

  createForPost: function (postId, type, url, trx) {
    switch (type) {
      case 'image':
        return createAndAddSize({
          post_id: postId,
          url: url,
          type,
          transacting: trx
        })
      case 'video':
        return this.generateThumbnailUrl(url)
        .then(thumbnail_url =>
          createAndAddSize({
            post_id: postId,
            transacting: trx,
            url, thumbnail_url, type
          }))
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
  },

  generateThumbnailUrl: videoUrl => {
    if (!videoUrl || videoUrl === '') return Promise.resolve()

    if (videoUrl.match(/youtu\.?be/)) {
      const videoId = videoUrl.match(/(youtu.be\/|embed\/|\?v=)([A-Za-z0-9\-_]+)/)[2]
      const url = `http://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      return Promise.resolve(url)
    }

    if (videoUrl.match(/vimeo/)) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)[1]
      const url = `http://vimeo.com/api/v2/video/${videoId}.json`
      return new Promise((resolve, reject) => {
        request(url, (err, resp, body) => {
          if (err) reject(err)
          resolve(JSON.parse(body)[0].thumbnail_large)
        })
      })
    }

    return Promise.resolve()
  }
})

const createAndAddSize = function (attrs) {
  const url = attrs.type === 'image' ? attrs.url
    : attrs.type === 'video' ? attrs.thumbnail_url : null

  if (url) {
    return GetImageSize(url).then(dimensions =>
      Media.create(merge({}, attrs, pick(['width', 'height'], dimensions))))
  }

  return Media.create(attrs)
}
