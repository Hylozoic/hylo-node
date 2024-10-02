
exports.up = async function (knex) {
  await knex.schema.table('moderation_actions', table => {
    table.bigInteger('group_id').references('id').inTable('groups')
  })
}

exports.down = async function (knex) {
  await knex.schema.table('moderation_actions', table => {
    table.dropColumn('group_id')
  })
}
