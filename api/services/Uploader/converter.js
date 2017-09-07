import sharp from 'sharp'

const sizes = {
  userAvatar: {width: 200, height: 200},
  userBanner: {width: 1600, height: 600},
  communityAvatar: {width: 160, height: 160},
  communityBanner: {width: 1600, height: 600},
  networkAvatar: {width: 160, height: 160},
  networkBanner: {width: 1600, height: 600}
}

export function createConverterStream (type, id, strategy = 'center') {
  const { width, height } = sizes[type]
  return sharp()
  .resize(width, height)
  .crop(strategy)
}
