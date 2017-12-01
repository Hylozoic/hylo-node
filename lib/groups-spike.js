async function reset () {
  return bookshelf.knex.transaction(async trx => {
    await GroupMembership.query().del().transacting(trx)
    await GroupConnection.query().del().transacting(trx)
    await Group.query().del().transacting(trx)
  })
}

async function seed () {
  const network = await Group.forge({
    group_data_type: 'networks',
    group_data_id: '1'
  }).save()

  const community = await Group.forge({
    group_data_type: 'communities',
    group_data_id: '1'
  }).save()

  const post = await Group.forge({
    group_data_type: 'posts',
    group_data_id: '8190'
  }).save()

  const follows = await Follow.where({post_id: '8190'}).fetchAll()
  for (let follow of follows.models) {
    await GroupMembership.forge({
      user_id: follow.get('user_id'),
      group_id: post.id
    }).save()
  }

  await GroupConnection.forge({
    child_group_id: post.id,
    parent_group_id: community.id
  }).save()

  await GroupConnection.forge({
    child_group_id: community.id,
    parent_group_id: network.id
  }).save()
}

module.exports = async function () {
  await reset()
  await seed()
}
