exports.up = function (knex, Promise) {
  return knex.schema.createTable('user_connections', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('other_user_id').references('id').inTable('users')
    table.string('type')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_connections') 
}
