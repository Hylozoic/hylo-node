'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.enu('visibility', ['public', 'private', 'secret']).defaultTo('secret');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumn('visibility');
  });
};

