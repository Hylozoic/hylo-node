'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.integer('badge_no').defaultTo(0);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.dropColumn('badge_no');
  });
};
