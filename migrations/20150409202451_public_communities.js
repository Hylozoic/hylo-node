'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.boolean('allow_public_content').defaultTo(false);
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumn('allow_public_content');
  })
};
