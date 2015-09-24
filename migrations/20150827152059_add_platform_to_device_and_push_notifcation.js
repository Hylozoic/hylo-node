'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('push_notifications', function(table) {
    table.string('platform')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.table('push_notifications', function(table) {
    table.dropColumn('platform')
  })
}
