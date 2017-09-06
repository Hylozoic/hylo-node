import sharp from 'sharp'

export const userAvatarUploadSettings = person => ({
  id: person.id,
  subject: 'user-avatar',
  path: `user/${person.id}/avatar`,
  convert: {width: 200, height: 200, fit: 'crop', rotate: 'exif'}
})

const sizes = {
  userAvatar: {width: 200, height: 200},
  userBanner: {width: 1600, height: 600}
}

export function createConverterStream (type, id, strategy = 'center') {
  const { width, height } = sizes[type]
  return sharp()
  .resize(width, height)
  .crop(strategy)
}
