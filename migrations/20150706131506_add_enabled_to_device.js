'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.boolean('enabled').defaultTo(true);
  });  
};

exports.down = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.dropColumn('enabled');
  });
};
