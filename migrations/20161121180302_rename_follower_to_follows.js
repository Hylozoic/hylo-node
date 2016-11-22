exports.up = function (knex, Promise) {
  return knex.schema.renameTable('follower', 'follows')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('follows', 'follower')
}
