exports.up = function (knex, Promise) {
  return knex.schema.renameTable('contributor', 'contributions')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('contributions', 'contributor')
}
