import { joinRoom, leaveRoom } from '../services/Websockets'

module.exports = {
  subscribe: function (req, res) {
    joinRoom(req, res, 'group', res.locals.group.id)
  },

  unsubscribe: function (req, res) {
    leaveRoom(req, res, 'group', res.locals.group.id)
  }
}
