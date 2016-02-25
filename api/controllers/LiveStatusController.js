module.exports = {

  show: function (req, res) {
    if (!req.session.userId) {
      return res.ok({})
    }
    User.find(req.session.userId)
    .then(user => res.ok({new_notification_count: user.get('new_notification_count')}))
  }
}
