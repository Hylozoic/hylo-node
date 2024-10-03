exports.up = async function(knex) {
  await knex.schema.alterTable('group_memberships', async (table) => {
    table.integer('new_post_count').defaultsTo(0).alter()
  })
  await knex('group_memberships').where({ new_post_count: null }).update({ new_post_count: 0 })
}

exports.down = async function(knex) {
}
