exports.up = function (knex) {
  return knex.schema.table('posts', table => {
    table.jsonb('description_raw').defaultTo('{}')
  })
}

exports.down = function (knex) {
  return knex.schema.table('posts', table => {
    table.dropColumn('description_raw')
  })
}
