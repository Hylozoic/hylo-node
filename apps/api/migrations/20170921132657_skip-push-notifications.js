
exports.up = function (knex, Promise) {
  return knex.schema.table('push_notifications', t => t.boolean('disabled'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('push_notifications', t => t.dropColumn('disabled'))
}
