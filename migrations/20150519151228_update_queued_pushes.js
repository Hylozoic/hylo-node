'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('queued_pushes', function(table) {
    table.string('alert').defaultTo('');  
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('queued_pushes', function(table) {
    table.dropColumn('alert');
  });
};
