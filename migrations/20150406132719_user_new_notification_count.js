'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users', function(table) {
    table.integer('new_notification_count').defaultTo(0);
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('new_notification_count');
  })
};
