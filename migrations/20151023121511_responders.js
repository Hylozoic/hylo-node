'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('event_responses', function (table) {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('post_id').references('id').inTable('post')
    table.string('response')
    table.unique(['user_id', 'post_id'])
    table.timestamps()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('event_responses')
}
