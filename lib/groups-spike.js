/* globals LastRead */
/* eslint-disable camelcase */

const reset = async () =>
  bookshelf.knex.transaction(async trx =>
    Promise.all([
      GroupMembership.query().del().transacting(trx),
      GroupConnection.query().del().transacting(trx),
      Group.query().del().transacting(trx)
    ]))

async function makeGroups (model) {
  const tableName = model.collection().tableName()
  const ids = await model.query().pluck('id')
  const rows = ids.map(id => ({group_data_id: id, group_data_type: tableName}))
  await bookshelf.knex.batchInsert('groups', rows)
  return ids.length
}

async function makeGroupMemberships ({ model, groupDataIdColumn, parentModel, settings }) {
  const tableName = parentModel.collection().tableName()
  const rows = await model.query().select('user_id', groupDataIdColumn)
  let count = 0

  async function processRow (row) {
    count += 1
    if (count % 500 === 0) process.stdout.write('.')
    const { user_id, [groupDataIdColumn]: parentId } = row
    const group_id = await Group.query().where({
      group_data_type: tableName,
      group_data_id: parentId
    }).pluck('id').then(r => r[0])

    return {user_id, group_id, settings}
  }

  const rowsToInsert = await Promise.all(rows.map(processRow))
  console.log('')
  await bookshelf.knex.batchInsert('group_memberships', rowsToInsert)
  return rowsToInsert.length
}

async function updateGroupMemberships ({
  model,
  groupDataIdColumn,
  parentModel,
  settings,
  selectColumns
}) {
  const tableName = parentModel.collection().tableName()
  const rows = await model.query().select(['user_id', groupDataIdColumn, ...selectColumns])

  async function processRow (row) {
    const { user_id, [groupDataIdColumn]: parentId } = row
    const group_id = await Group.query().where({
      group_data_type: tableName,
      group_data_id: parentId
    }).pluck('id').then(r => r[0])

    if (typeof settings === 'function') {
      settings = settings(row)
    }

    return GroupMembership.where({user_id, group_id}).fetch()
    .then(gm => gm.addSetting(settings, true))
  }

  for (let row of rows) await processRow(row)
  return rows.length
}

async function makeGroupConnections () {

}

async function seed () {
  console.log('Network:', await makeGroups(Network))
  console.log('Community:', await makeGroups(Community))
  console.log('Topic:', await makeGroups(Tag))
  console.log('Post:', await makeGroups(Post))

  console.log('Follow:', await makeGroupMemberships({
    model: Follow,
    groupDataIdColumn: 'post_id',
    parentModel: Post,
    settings: {following: true}
  }))

  console.log('LastRead:', await updateGroupMemberships({
    model: LastRead,
    groupDataIdColumn: 'post_id',
    parentModel: Post,
    settings: row => ({lastReadAt: row.last_read_at}),
    selectColumns: ['last_read_at']
  }))

  console.log('PostMembership:', await makeGroupConnections(PostMembership))

  // await GroupConnection.forge({
  //   child_group_id: post.id,
  //   parent_group_id: community.id
  // }).save()
  //
  // await GroupConnection.forge({
  //   child_group_id: community.id,
  //   parent_group_id: network.id
  // }).save()
}

module.exports = async function (shouldReset = true) {
  if (shouldReset) await reset()
  await seed()
}
