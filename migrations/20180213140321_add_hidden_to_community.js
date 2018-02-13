exports.up = function (knex, Promise) {
  return knex.schema.table('communities', table => {
    table.boolean('hidden')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities', table => {
    table.dropColumn('hidden')
  })
}
