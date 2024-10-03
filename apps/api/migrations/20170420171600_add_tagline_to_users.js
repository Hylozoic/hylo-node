exports.up = function (knex, Promise) {
  return knex.schema.table('users', table => {
    table.string('tagline')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('tagline')
  })
}
