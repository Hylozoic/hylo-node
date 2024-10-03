import sharp from 'sharp'
import { PassThrough } from 'stream'
import * as types from './types'

const sizes = {
  [types.USER_AVATAR]: {width: 200, height: 200},
  [types.USER_BANNER]: {width: 1600, height: 600},
  [types.GROUP_AVATAR]: {width: 160, height: 160},
  [types.GROUP_BANNER]: {width: 1600, height: 600},

  // TODO keep the original size around but create thumbnails for different
  // purposes, e.g. viewing on a post card
  [types.POST]: {width: 1200},
  [types.COMMENT]: {width: 1200}
}

export function createConverterStream (uploadType, id, { fileType }) {
  const size = sizes[uploadType]
  if (!size || !fileType || !fileType.mime.startsWith('image')) {
    return new PassThrough()
  }

  // TODO create thumbnails now, instead of using Media.createThumbnail? pipe to
  // multiple streams? then we have to refactor to have one storage stream for
  // each converter

  return sharp()
    .rotate() // apply EXIF (for rotation)
    .resize(size.width, size.height, { withoutEnlargement: true })
}
