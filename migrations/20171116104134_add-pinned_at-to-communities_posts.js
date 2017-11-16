exports.up = function (knex, Promise) {
  return knex.schema.table('communities_posts', table => {
    table.timestamp('pinned_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_posts', table => {
    table.dropColumn('pinned_at')
  })
}
