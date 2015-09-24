'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.string('platform')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.dropColumn('platform')
  })
}
