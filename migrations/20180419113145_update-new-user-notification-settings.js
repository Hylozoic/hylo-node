require("@babel/register")
const models = require('../api/models')
const DataType = require('../api/models/group/DataType').default

exports.up = async function (knex, Promise) {
  models.init()
  console.log('Updating new users notifications')

  const users = await User.where('created_at', '>', '2017-12-31')
  .fetchAll()

  return Promise.map(users.models, user => user.addSetting({
    dm_notifications: 'both',
    comment_notifications: 'both'
  }, true)
  .then(() => GroupMembership.where({
    group_data_type: DataType.COMMUNITY,
    user_id: user.id
  }).fetchAll())
  .then(memberships => Promise.map(memberships.models,
    membership => {
      return membership.addSetting({
        sendEmail: true,
        sendPushNotifications: true
      }, true)
    }
  )))
}

exports.down = function (knex, Promise) {
  // this is a one way migration
  return Promise.resolve()
}
