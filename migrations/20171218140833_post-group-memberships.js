/* globals FollowDeprecated, LastReadDeprecated */
require("@babel/register")
const models = require('../api/models')
const {
  makeGroups, makeGroupMemberships, updateGroupMemberships
} = require('../api/models/group/migration')

exports.up = async function (knex, Promise) {
  models.init()
  console.log('Creating groups. This can take a while...')
  console.log('Post:', await makeGroups(Post))

  console.log('Follow:', await makeGroupMemberships({
    model: FollowDeprecated,
    parent: 'post',
    settings: {following: true},
    copyColumns: {added_at: 'created_at'}
  }))

  console.log('LastRead:', await updateGroupMemberships({
    model: LastReadDeprecated,
    parent: 'post',
    getSettings: row => ({lastReadAt: row.last_read_at}),
    selectColumns: ['last_read_at']
  }))
}

exports.down = function (knex, Promise) {
  return knex.raw('truncate table groups, group_connections, group_memberships')
}
