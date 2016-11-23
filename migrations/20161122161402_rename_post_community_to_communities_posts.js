exports.up = function (knex, Promise) {
  return knex.schema.renameTable('post_community', 'communities_posts')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('communities_posts', 'post_community')
}
