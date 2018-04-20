require('babel-register')
const models = require('../api/models')
const DataType = require('../api/models/group/DataType').default

exports.up = async function (knex, Promise) {
  console.log('initialzing models')
  models.init()
  // const users = await User.where('created_at', '>', '2017-12-31')

  console.log('fetching users')
  const users = await User.where('id', '=', '11204')
    .fetchAll()

  console.log('users', users)

  users.each(user => {
    console.log('adding setting to user', user.id)
    user.addSetting({
      dm_notifications: 'both',
      comment_notifications: 'both'
    }, true)
    .then(() => {
      console.log('going to fetch memberships')
      return GroupMembership.where({
        group_data_type: DataType.COMMUNITY,
        user_id: user.id
      }).fetchAll().then(ms => console.log('ms', ms))
    })
    .then(memberships => {
      console.log('memberships', memberships)
      memberships.each(async membership => {
        console.log('membership.settings', membership.get('settings'))
        // console.log('membership.addSetting', membership.addSetting)
      })
    })
  })
}

exports.down = function (knex, Promise) {
  // this is a one way migration
  return Promise.resolve()
}
