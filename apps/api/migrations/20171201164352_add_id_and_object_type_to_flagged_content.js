exports.up = function (knex, Promise) {
  return knex.schema.table('flagged_items', table => {
    table.bigInteger('object_id')
    table.string('object_type')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_posts', table => {
    table.dropColumn('object_id')
    table.dropColumn('object_type')
  })
}
