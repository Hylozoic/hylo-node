
exports.up = function(knex) {
  return knex.schema.createTable('user_affiliations', table => {
    table.increments().primary()

    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.string('role')
    table.string('preposition')
    table.string('org_name')
    table.string('url')
    table.boolean('is_active').defaultTo(true)

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('user_affiliations')
}
