exports.up = function (knex, Promise) {
  return knex.schema.renameTable('users_community', 'communities_users')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('communities_users', 'users_community')
}
