
exports.up = async function(knex, Promise) {
  await knex.schema.createTable('agreements', table => {
    table.increments().primary()
    table.text('title')
    table.text('description')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.createTable('groups_agreements', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('agreement_id').references('id').inTable('agreements').notNullable()
    table.boolean('active').defaultTo(true)
    table.integer('order')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.createTable('users_groups_agreements', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('agreement_id').references('id').inTable('agreements').notNullable()
    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.boolean('accepted').defaultTo(true)
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('users_groups_agreements')
  await knex.schema.dropTable('groups_agreements')
  await knex.schema.dropTable('agreements')
}
