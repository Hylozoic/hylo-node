
exports.up = function (knex, Promise) {
  return knex.schema.dropTable('tags_users')
}

exports.down = function (knex, Promise) {
}
