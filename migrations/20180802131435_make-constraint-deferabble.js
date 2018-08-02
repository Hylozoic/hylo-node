exports.up = function (knex, Promise) {
  return knex.raw(
    `ALTER TABLE push_notifications ALTER CONSTRAINT push_notifications_device_id_foreign DEFERRABLE INITIALLY DEFERRED`
  )
}

exports.down = function (knex, Promise) {
  return knex.raw(
    `ALTER TABLE push_notifications ALTER CONSTRAINT push_notifications_device_id_foreign NOT DEFERRABLE`
  )
}
