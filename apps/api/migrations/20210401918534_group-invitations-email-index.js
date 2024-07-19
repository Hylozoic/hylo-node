
exports.up = async function(knex) {
  await knex.schema.table('group_invites', table => {
    table.index('email')
  })
}

exports.down = async function(knex) {
  await knex.schema.table('group_invites', table => {
    table.dropIndex('email')
  })
}
