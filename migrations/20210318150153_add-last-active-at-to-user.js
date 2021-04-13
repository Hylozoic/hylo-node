exports.up = function (knex, Promise) {
  return knex.schema.table('users', table => {
    table.timestamp('last_active_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('last_active_at')
  })
}
