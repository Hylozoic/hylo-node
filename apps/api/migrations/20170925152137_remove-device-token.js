
exports.up = function (knex, Promise) {
  return knex.schema.table('push_notifications', t =>
    t.dropColumn('device_token'))
}

exports.down = function (knex, Promise) {

}
