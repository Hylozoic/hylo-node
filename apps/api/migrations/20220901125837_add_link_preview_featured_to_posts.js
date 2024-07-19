exports.up = function (knex) {
  return knex.schema.table('posts', table => {
    table.boolean('link_preview_featured').defaultTo(false)
  })
}

exports.down = function (knex) {
  return knex.schema.table('posts', table => {
    table.dropColumn('link_preview_featured')
  })
}
