exports.up = function (knex, Promise) {
  return knex.schema.renameTable('post', 'posts')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('posts', 'post')
}
