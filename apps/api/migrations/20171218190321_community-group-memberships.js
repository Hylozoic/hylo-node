require("@babel/register")
const models = require('../api/models')
const DataType = require('../api/models/group/DataType').default
const {
  makeGroups,
  makeGroupMemberships,
  deactivateMembershipsByGroupDataType,
  reconcileNumMembersInCommunities
} = require('../api/models/group/migration')
const { camelCase, mapKeys } = require('lodash')

exports.up = async function (knex, Promise) {
  models.init()
  console.log('Creating groups. This can take a while...')
  console.log('Community:', await makeGroups(Community))

  console.log('Membership:', await makeGroupMemberships({
    model: MembershipDeprecated, // eslint-disable-line
    parent: 'community',
    copyColumns: ['role', 'active', 'created_at', 'new_post_count'],
    selectColumns: ['settings', 'last_viewed_at'],
    getSettings: row => Object.assign(
      mapKeys(row.settings, (v, k) => camelCase(k)),
      {
        lastReadAt: row.last_viewed_at
      }
    )
  }))

  console.log('Deactivating Memberships:', await deactivateMembershipsByGroupDataType(DataType.COMMUNITY))
  console.log('Reconciling num_members in communities', await reconcileNumMembersInCommunities())
}

exports.down = async function (knex, Promise) {
  await knex.raw('delete from group_memberships where group_id in (select id from groups where group_data_type = 1)')
  await knex.raw('delete from groups where group_data_type = 1')
}
