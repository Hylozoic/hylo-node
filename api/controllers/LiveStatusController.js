module.exports = {

  liveStatus: function (req, res) {
    User.find(req.session.userId)
    .then(user => res.ok({new_notification_count: user.get('new_notification_count')}))
  }
}
