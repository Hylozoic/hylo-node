/* eslint-disable camelcase */
import GetImageSize from '../services/GetImageSize'
import request from 'request'
import { merge } from 'lodash'
import { pick } from 'lodash/fp'

export const VALID_MEDIA_TYPES = [
  'file',
  'image',
  'gdoc',
  'video'
]

export const DEFAULT_MEDIA_TYPE = 'file'

module.exports = bookshelf.Model.extend({
  tableName: 'media',

  post: function () {
    return this.belongsTo(Post)
  },

  comment: function () {
    return this.belongsTo(Comment)
  },

  updateMetadata: function (opts) {
    const isVideo = this.get('type') === 'video'
    var thumbnail_url = this.get('thumbnail_url')

    return Promise.resolve(isVideo && Media.generateThumbnailUrl(this.get('url')))
    .then(url => {
      if (url) thumbnail_url = url

      const urlToMeasure = isVideo ? url : this.get('url')
      return GetImageSize(urlToMeasure)
      .then(({ width, height }) =>
        this.save({width, height, thumbnail_url}, Object.assign({patch: true}, opts)))
    })
  },

  createThumbnail: function ({ thumbnailSize, transacting }) {
    return AssetManagement.resizeAsset(this, 'url', 'thumbnail_url', {
      width: thumbnailSize,
      height: thumbnailSize,
      type: 'comment',
      transacting
    })
  }
}, {

  create: function ({
    post_id,
    url,
    type,
    name,
    thumbnail_url,
    width,
    height,
    comment_id,
    transacting,
    thumbnailSize,
    position
  }) {
    return Media.forge({
      created_at: new Date(),
      post_id,
      url,
      type,
      name,
      thumbnail_url,
      width,
      height,
      comment_id,
      position
    })
    .save(null, { transacting })
    .tap(media =>
      thumbnailSize && media.createThumbnail({ thumbnailSize, transacting }))
  },

  createForSubject: function ({subjectType, subjectId, type, url, position = 0}, trx) {
    const subjectIdKey = `${subjectType.toLowerCase()}_id`

    const mediaAttrs = {
      [subjectIdKey]: subjectId,
      type,
      url,
      position,
      transacting: trx
    }

    switch (type) {
      case 'image':
        return createAndAddSize(mediaAttrs)
      case 'file':
        return Media.create(mediaAttrs)
      case 'video':
        return this.generateThumbnailUrl(url)
        .then(thumbnail_url => createAndAddSize(Object.assign({}, mediaAttrs, { thumbnail_url })))
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
  const url = attrs.type === 'image'
    ? attrs.url
    : attrs.type === 'video'
      ? attrs.thumbnail_url
      : null

  if (url) {
    return GetImageSize(url).then(dimensions =>
      Media.create(merge({}, attrs, pick(['width', 'height'], dimensions))))
  }

  return Media.create(attrs)
}

export function getMediaTypeFromMimetype (mimetype) {
  let baseMimetype = mimetype && mimetype.split('/')[0]

  // NOTE: This doesn't account for the currently unsupportd
  // legacy special cases of 'gdoc' or 'video'
  return VALID_MEDIA_TYPES.includes(baseMimetype)
    ? baseMimetype
    : DEFAULT_MEDIA_TYPE
}
