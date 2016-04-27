'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('notifications', function (table) {
    table.increments()
    table.bigInteger('activity_id').references('id').inTable('activity')
    table.string('media')
    table.dateTime('sent_at')
    table.timestamps()
  })
  .then(() => Promise.join(
    knex.raw('ALTER TABLE notifications ALTER CONSTRAINT notifications_activity_id_foreign DEFERRABLE INITIALLY DEFERRED')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('notifications')
}
