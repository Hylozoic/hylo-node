module.exports = {
  show: function (req, res) {
    if (!req.session.userId) return res.ok({})

    User.find(req.session.userId, {withRelated: ['memberships']})
    .then(user => res.ok({
      new_notification_count: user.get('new_notification_count'),
      memberships: user.relations.memberships.map(m => ({
        id: m.id,
        new_notification_count: m.get('new_notification_count')
      }))
    }))
  }
}
