require('babel-register')
const models = require('../api/models')
const { makeGroups, makeGroupMemberships } = require('../api/models/group/migration')
const { camelCase, mapKeys } = require('lodash')

exports.up = async function (knex, Promise) {
  models.init()
  console.log('Creating groups. This can take a while...')
  console.log('Community:', await makeGroups(Community))
  console.log('Membership:', await makeGroupMemberships({
    model: MembershipDeprecated, // eslint-disable-line
    parent: 'community',
    copyColumns: ['role', 'active', 'created_at'],
    selectColumns: ['settings', 'last_viewed_at', 'new_post_count'],
    getSettings: row => Object.assign(
      mapKeys(row.settings, (v, k) => camelCase(k)),
      {
        lastReadAt: row.last_viewed_at,
        newPostCount: row.new_post_count
      }
    )
  }))
}

exports.down = async function (knex, Promise) {
  await knex.raw('delete from group_memberships where group_id in (select id from groups where group_data_type = 1)')
  await knex.raw('delete from groups where group_data_type = 1')
}
