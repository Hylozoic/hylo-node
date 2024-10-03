
exports.up = function (knex, Promise) {
  return knex.schema.raw('alter table devices alter id type bigint')
  .then(() => knex.schema.table('devices', t => t.string('player_id')))
  .then(() => knex.schema.table('push_notifications', t => {
    t.bigint('device_id').references('id').inTable('devices')
  }))
  .then(() => knex.raw(`
    update push_notifications
    set device_id = (select id from devices where token = device_token)
    `))
}

exports.down = function (knex, Promise) {
  return knex.schema.raw('alter table devices alter id type int')
  .then(() => knex.schema.table('devices', t => t.dropColumn('player_id')))
  .then(() => knex.schema.table('push_notifications', t => {
    t.dropColumn('device_id')
  }))
}
