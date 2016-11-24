exports.up = function (knex, Promise) {
  return knex.schema.renameTable('community', 'communities')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('communities', 'community')
}
