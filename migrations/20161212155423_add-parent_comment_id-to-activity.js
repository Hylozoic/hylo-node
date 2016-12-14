exports.up = function (knex, Promise) {
  return knex.schema.table('activities', table => {
    table.bigInteger('parent_comment_id').references('id').inTable('comments')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('activities', table => {
    table.dropColumn('parent_comment_id')
  })
}
