import { merge } from 'lodash'
import { pick } from 'lodash/fp'

export const VALID_MEDIA_TYPES = [
  'file',
  'image',
  'gdoc',
  'video'
]

export const DEFAULT_MEDIA_TYPE = 'file'


export const createAndAddSize = function (attrs) {
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
