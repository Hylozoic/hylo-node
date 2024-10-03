
exports.up = async function(knex) {
  await knex.schema.createTable('groups_suggested_skills', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('skill_id').references('id').inTable('skills').notNullable()
    table.timestamp('created_at')
    table.index('group_id')
  })
}

exports.down = async function(knex) {
  await knex.schema.dropTable('groups_suggested_skills')
}
