exports.up = function (knex) {
  return knex.schema.table('tag_follows', table => {
    table.bigInteger('last_read_post_id').references('id').inTable('posts')
  })
}

exports.down = function (knex) {
  return knex.schema.table('tag_follows', table => {
    table.dropColumn('last_read_post_id')
  })
}
