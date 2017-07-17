exports.up = function (knex, Promise) {
  return knex.schema.table('communities', table => {
    table.integer('num_members').defaultTo(0)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities', table => {
    table.dropColumn('num_members')
  })
}
