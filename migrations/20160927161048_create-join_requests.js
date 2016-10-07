'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('join_requests', function (table) {
    table.increments()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('community_id').references('id').inTable('community')
    table.timestamps()
  })
  .then(() => Promise.join(
    knex.raw('ALTER TABLE join_requests ALTER CONSTRAINT join_requests_user_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE join_requests ALTER CONSTRAINT join_requests_community_id_foreign DEFERRABLE INITIALLY DEFERRED')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('join_requests')
}
