
exports.up = async function (knex) {
  await knex.schema.createTable('zapier_triggers', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('group_id').references('id').inTable('groups')
    table.boolean('is_active').defaultTo(true)
    table.string('type').notNullable()
    table.string('target_url').notNullable()
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.raw('alter table zapier_triggers alter constraint zapier_triggers_user_id_foreign deferrable initially deferred')
  await knex.raw('alter table zapier_triggers alter constraint zapier_triggers_group_id_foreign deferrable initially deferred')
}

exports.down = async function (knex) {
  await knex.schema.dropTable('zapier_triggers')
}
