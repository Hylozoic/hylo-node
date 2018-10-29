import { joinRoom, leaveRoom } from '../services/Websockets'

module.exports = {
  subscribe: function (req, res) {
    joinRoom(req, res, 'network', res.locals.network.id)
  },

  unsubscribe: function (req, res) {
    leaveRoom(req, res, 'network', res.locals.community.id)
  }
}
