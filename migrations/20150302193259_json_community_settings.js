'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.json('settings').defaultTo('{}');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumn('settings');
  })
};
