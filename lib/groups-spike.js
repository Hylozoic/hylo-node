/* globals LastReadDeprecated, FollowDeprecated */
/* eslint-disable camelcase */

import { compact, isNil } from 'lodash'
import { getDataTypeForModel } from '../api/models/group/DataType'

const reset = async () => bookshelf.knex.raw('truncate table groups, group_connections, group_memberships')

export async function makeGroups (model) {
  const group_data_type = getDataTypeForModel(model)
  const rows = await model.query().select(['id', 'created_at'])
  const rowsToInsert = rows.map(row => ({
    group_data_type,
    group_data_id: row.id,
    created_at: row.created_at
  }))
  await bookshelf.knex.batchInsert('groups', rowsToInsert)
  return rowsToInsert.length
}

export async function makeGroupMemberships ({ model, parent, copyColumns, settings }) {
  const { target, foreignKey } = getRelatedData(model, parent)

  let columns = ['user_id', foreignKey]
  if (Array.isArray(copyColumns)) {
    columns = columns.concat(copyColumns)
  } else if (copyColumns) {
    columns = columns.concat(Object.keys(copyColumns))
  }
  const rows = await model.query().select(columns)

  async function processRow (row) {
    const { user_id, [foreignKey]: parentId } = row
    const group_id = await getGroupId(target, parentId)

    const newRow = {user_id, group_id, settings}
    if (Array.isArray(copyColumns)) {
      for (let k of copyColumns) newRow[k] = row[k]
    } else if (copyColumns) {
      for (let k in copyColumns) newRow[copyColumns[k]] = row[k]
    }
    return newRow
  }

  const rowsToInsert = await Promise.all(rows.map(processRow))
  await bookshelf.knex.batchInsert('group_memberships', rowsToInsert)
  return rowsToInsert.length
}

export async function updateGroupMemberships ({ model, parent, getSettings, selectColumns }) {
  const { target, foreignKey } = getRelatedData(model, parent)
  const rows = await model.query().select(['user_id', foreignKey, ...selectColumns])

  async function processRow (row) {
    const { user_id, [foreignKey]: parentId } = row
    const group_id = await getGroupId(target, parentId)
    const gm = await GroupMembership.where({user_id, group_id}).fetch()
    return gm.addSetting(getSettings(row), true)
  }

  for (let row of rows) await processRow(row)
  return rows.length
}

export async function makeGroupConnectionsM2M ({ model, filter, child, parent }) {
  const {
    foreignKey: childFk, target: childModel
  } = getRelatedData(model, child)
  const {
    foreignKey: parentFk, target: parentModel
  } = getRelatedData(model, parent)
  return makeGroupConnections({
    model, filter, childFk, childModel, parentFk, parentModel
  })
}

export async function makeGroupConnectionsFk ({ model, parent, filter }) {
  const { foreignKey, target } = getRelatedData(model, parent)
  return makeGroupConnections({
    model,
    filter,
    childFk: 'id',
    childModel: model,
    parentFk: foreignKey,
    parentModel: target
  })
}

async function makeGroupConnections ({ model, filter, childModel, childFk, parentModel, parentFk }) {
  const query = filter ? model.query(filter).query() : model.query()
  const rows = await query.select(childFk, parentFk)
  const rowsToInsert = compact(await Promise.all(rows.map(async row => {
    const parent_group_id = await getGroupId(parentModel, row[parentFk])
    if (!parent_group_id) return null
    return checkRow({
      parent_group_id,
      child_group_id: await getGroupId(childModel, row[childFk]),
      parent_group_data_type: getDataTypeForModel(parentModel),
      child_group_data_type: getDataTypeForModel(childModel)
    })
  })))

  await bookshelf.knex.batchInsert('group_connections', rowsToInsert)
  return rowsToInsert.length
}

async function seed () {
  /*
  TODO

  communities_tags (derived from group chain: topic -> post -> community)
  networks_posts (derived from group chain: post -> community -> network)
  networks_users (derived from group chain: user -> community -> network)
  tag_follows
  */

  console.log('Network:', await makeGroups(Network))
  console.log('Community:', await makeGroups(Community))
  console.log('Topic:', await makeGroups(Tag))
  console.log('Post:', await makeGroups(Post))
  console.log('Comment:', await makeGroups(Comment))

  console.log('Follow:', await makeGroupMemberships({
    model: FollowDeprecated,
    parent: 'post',
    settings: {following: true},
    copyColumns: {added_at: 'created_at'}
  }))

  console.log('Membership:', await makeGroupMemberships({
    model: Membership,
    parent: 'community',
    copyColumns: ['role', 'active', 'created_at']
  }))

  console.log('LastRead:', await updateGroupMemberships({
    model: LastReadDeprecated,
    parent: 'post',
    getSettings: row => ({lastReadAt: row.last_read_at}),
    selectColumns: ['last_read_at']
  }))

  console.log('PostMembership:', await makeGroupConnectionsM2M({
    model: PostMembership,
    child: 'post',
    parent: 'community'
  }))

  console.log('Community.network_id:', await makeGroupConnectionsFk({
    model: Community,
    parent: 'network'
  }))

  console.log('PostTag', await makeGroupConnectionsM2M({
    model: PostTag,
    parent: 'post',
    child: 'tag'
  }))

  console.log('CommentTag', await makeGroupConnectionsM2M({
    model: CommentTag,
    parent: 'comment',
    child: 'tag'
  }))
}

export default async function () {
  await reset()
  await seed()
}

async function pluckOneId (query) {
  return query.pluck('id').then(r => r[0])
}

async function getGroupId (model, dataId) {
  return pluckOneId(Group.query().where({
    group_data_type: getDataTypeForModel(model),
    group_data_id: dataId
  }))
}

function getRelatedData (model, relationName) {
  return model.forge()[relationName]().relatedData
}

function checkRow (row) {
  for (let k in row) {
    if (isNil(row[k])) {
      throw new Error('empty value in row!')
    }
  }
  return row
}
