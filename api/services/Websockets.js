const validMessageTypes = [
  'commentAdded',
  'messageAdded',
  'userTyping',
  'newThread',
  'newPost'
]

export function pushToSockets (room, messageType, payload, socketToExclude) {
  if (!validMessageTypes.includes(messageType)) {
    throw new Error(`unknown message type: ${messageType}`)
  }

  if (process.env.NODE_ENV === 'test') return Promise.resolve({room, messageType, payload})
  sails.sockets.broadcast(room, messageType, payload, socketToExclude)
  return Promise.resolve()
}

const makeRoomAction = method => (req, res, type, id, options = {}) => {
  const callback = options.callback || emptyResponse(res)
  const room = roomTypes[type](id)
  sails.log.info(`${method}: ${room}`)
  return sails.sockets[method](req, room, callback)
}

export const joinRoom = makeRoomAction('join')
export const leaveRoom = makeRoomAction('leave')

export function userRoom (userId) {
  return `users/${userId}`
}

export function postRoom (postId) {
  return `posts/${postId}`
}

export function communityRoom (communityId) {
  return `communities/${communityId}`
}

const roomTypes = {
  user: userRoom,
  post: postRoom,
  community: communityRoom
}

const emptyResponse = res => err => err ? res.serverError(err) : res.ok({})
