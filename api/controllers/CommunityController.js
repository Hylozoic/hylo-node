import { joinRoom, leaveRoom } from '../services/Websockets'

module.exports = {
  subscribe: function (req, res) {
    joinRoom(req, res, 'community', res.locals.community.id)
  },

  unsubscribe: function (req, res) {
    leaveRoom(req, res, 'community', res.locals.community.id)
  }
}
