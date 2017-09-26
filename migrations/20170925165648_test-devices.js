
exports.up = function (knex, Promise) {
  return knex.schema.table('devices', t => t.boolean('tester'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('devices', t => t.dropColumn('tester'))
}
