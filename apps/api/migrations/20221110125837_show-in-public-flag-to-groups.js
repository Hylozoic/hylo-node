exports.up = function (knex) {
  return knex.schema.table('groups', table => {
    table.boolean('allow_in_public').defaultTo(false)
  })
}

exports.down = function (knex) {
  return knex.schema.table('groups', table => {
    table.dropColumn('allow_in_public')
  })
}
