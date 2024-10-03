exports.up = async function(knex) {
  await knex.schema.createTable('user_verification_codes', table => {
    table.increments().primary()
    table.string('email').notNullable()
    table.string('code', 6).notNullable()
    table.timestamp('created_at')
    table.index('email')
  })
}

exports.down = async function(knex) {
  await knex.schema.dropTable('user_verification_codes')
}
