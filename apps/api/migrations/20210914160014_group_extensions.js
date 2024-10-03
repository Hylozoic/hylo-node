exports.up = async function (knex) {
  await knex.schema.createTable('extensions', table => {
    table.increments().primary()
    table.text('type')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.createTable('group_extensions', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('extension_id').references('id').inTable('extensions').notNullable()
    table.jsonb('data')
    table.boolean('active').defaultsTo(true)
    table.index('group_id')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.alterTable('groups', async (table) => {
    table.text('type')
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('extensions')
  await knex.schema.dropTable('group_extensions')

  return knex.schema.alterTable('groups', table => {
    table.dropColumn('type')
  })
}
