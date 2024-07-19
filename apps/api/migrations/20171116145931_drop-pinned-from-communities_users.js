exports.up = function (knex, Promise) {
  return knex.schema.table('communities_posts', table => {
    table.dropColumn('pinned')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_posts', table => {
    table.boolean('pinned').defaultTo(false)
  })
}
