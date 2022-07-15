exports.up = async function(knex) {
  await knex.schema.table('groups', table => {
    table.string('stripe_account_id')
  })

  await knex.schema.createTable('payment_plans', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()

    table.string('name')
    table.string('term')
    table.string('banner')
    table.text('description')
    table.float('charge')
    table.boolean('active').defaultTo(false)
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  return knex.schema.table('group_memberships', table => {
    table.bigInteger('payment_plan_id').references('id').inTable('payment_plans')
  })
}

exports.down = async function(knex) {
  await knex.schema.table('groups', table => {
    table.dropColumn('stripe_account_id')
  })

  await knex.schema.dropTable('payment_plans')
  
}
