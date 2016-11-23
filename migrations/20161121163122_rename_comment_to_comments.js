exports.up = function (knex, Promise) {
  return knex.schema.renameTable('comment', 'comments')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('comments', 'comment')
}
