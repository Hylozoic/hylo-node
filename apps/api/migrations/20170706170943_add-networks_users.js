exports.up = function (knex, Promise) {
  return knex.schema.createTable('networks_users', table => {
    table.increments().primary()
    table.bigInteger('network_id').references('id').inTable('networks')
    table.bigInteger('user_id').references('id').inTable('users')
    table.integer('role')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('networks_users')
}
