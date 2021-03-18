/* eslint-disable camelcase */

import { compact, isNil } from 'lodash'
import { getDataTypeForModel } from './DataType'

export async function makeGroups (model) {
  const group_data_type = getDataTypeForModel(model)
  // TODO: Need to ammend for Topic which doesn't have an active field
  const rows = await model.query().select(['id', 'created_at', 'active'])
  const rowsToInsert = rows.map(row => ({
    group_data_type,
    group_data_id: row.id,
    active: row.active,
    created_at: row.created_at
  }))
  await bookshelf.knex.batchInsert('groups', rowsToInsert)
  return rowsToInsert.length
}

export async function makeGroupMemberships ({ model, parent, copyColumns, selectColumns, settings, getSettings }) {
  const { target, foreignKey } = getRelatedData(model, parent)

  let columns = ['user_id', foreignKey]
  if (Array.isArray(copyColumns)) {
    columns = columns.concat(copyColumns)
  } else if (copyColumns) {
    columns = columns.concat(Object.keys(copyColumns))
  }

  if (selectColumns) {
    columns = columns.concat(selectColumns)
  }

  const rows = await model.query().select(columns)

  async function processRow (row) {
    const { user_id, [foreignKey]: parentId } = row
    const group_id = await getGroupId(target, parentId)

    const newRow = {user_id, group_id}

    if (getSettings) {
      newRow.settings = getSettings(row)
    } else {
      newRow.settings = settings
    }

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

export async function deactivateMembershipsByGroupDataType (group_data_type) {
  const parents = await Group.where({group_data_type, active: false})
  .fetchAll({withRelated: 'memberships'})
  const setInactive = group => Promise.map(group.relations.memberships.models,
    membership => membership.save({active: false}))
  await Promise.map(parents.models, setInactive)
  return parents.length
}

export async function reconcileNumMembersInCommunities () {
  const communities = await Community.fetchAll()
  await Promise.map(communities.models, c => c.reconcileNumMembers())
  return communities.length
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

export async function makeGroupRelationshipsM2M ({ model, filter, child, parent }) {
  const {
    foreignKey: childFk, target: childModel
  } = getRelatedData(model, child)
  const {
    foreignKey: parentFk, target: parentModel
  } = getRelatedData(model, parent)
  return makeGroupRelationships({
    model, filter, childFk, childModel, parentFk, parentModel
  })
}

export async function makeGroupRelationshipsFk ({ model, parent, filter }) {
  const { foreignKey, target } = getRelatedData(model, parent)
  return makeGroupRelationships({
    model,
    filter,
    childFk: 'id',
    childModel: model,
    parentFk: foreignKey,
    parentModel: target
  })
}

async function makeGroupRelationships ({ model, filter, childModel, childFk, parentModel, parentFk }) {
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

  await bookshelf.knex.batchInsert('group_relationships', rowsToInsert)
  return rowsToInsert.length
}

// This is not meant to be run. It's just here as an example of how to convert
// different relations. The actual conversion process should take place in
// knex migration files (see e.g. the post-group-memberships migration).
async function seed () { // eslint-disable-line no-unused-vars
  /*
  TODO

  communities_tags (derived from group chain: topic -> post -> community)
  networks_posts (derived from group chain: post -> community -> network)
  networks_users (derived from group chain: user -> community -> network)
  tag_follows
  */

  console.log('Network:', await makeGroups(Network))
  console.log('Topic:', await makeGroups(Tag))
  console.log('Comment:', await makeGroups(Comment))

  console.log('PostMembership:', await makeGroupRelationshipsM2M({
    model: PostMembership,
    child: 'post',
    parent: 'community'
  }))

  console.log('Community.network_id:', await makeGroupRelationshipsFk({
    model: Community,
    parent: 'network'
  }))

  console.log('PostTag', await makeGroupRelationshipsM2M({
    model: PostTag,
    parent: 'post',
    child: 'tag'
  }))

  console.log('CommentTag', await makeGroupRelationshipsM2M({
    model: CommentTag,
    parent: 'comment',
    child: 'tag'
  }))
}

async function getGroupId (model, dataId) {
  return Group.query().where({
    group_data_type: getDataTypeForModel(model),
    group_data_id: dataId
  }).pluck('id').then(r => r[0])
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
