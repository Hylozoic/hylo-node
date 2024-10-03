
exports.up = async function (knex, Promise) {
  await knex.schema.table('group_memberships', t => {
    t.integer('group_data_type')
  })
  await knex.raw('update group_memberships set group_data_type = (select group_data_type from groups where id = group_id)')
  await knex.raw('alter table group_memberships alter column group_data_type set not null')
}

exports.down = function (knex, Promise) {
  return knex.schema.table('group_memberships', t => t.dropColumn('group_data_type'))
}
