import sharp from 'sharp'
import { PassThrough } from 'stream'
import * as types from './types'

const sizes = {
  [types.USER_AVATAR]: {width: 200, height: 200},
  [types.USER_BANNER]: {width: 1600, height: 600},
  [types.COMMUNITY_AVATAR]: {width: 160, height: 160},
  [types.COMMUNITY_BANNER]: {width: 1600, height: 600},
  [types.NETWORK_AVATAR]: {width: 160, height: 160},
  [types.NETWORK_BANNER]: {width: 1600, height: 600},

  // TODO keep the original size around but create thumbnails for different
  // purposes, e.g. viewing on a post card
  [types.POST]: {width: 1200}
}

export function createConverterStream (uploadType, id, { strategy, fileType }) {
  const size = sizes[uploadType]
  if (!size || !fileType) return new PassThrough()

  // TODO create thumbnails now, instead of using Media.createThumbnail? pipe to
  // multiple streams? then we have to refactor to have one storage stream for
  // each converter

  return sharp()
  .resize(size.width, size.height)
  .crop(strategy)
  .withoutEnlargement()
}
