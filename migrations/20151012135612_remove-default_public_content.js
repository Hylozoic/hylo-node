'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumn('default_public_content');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.boolean('default_public_content').defaultTo(false);
  });
};

