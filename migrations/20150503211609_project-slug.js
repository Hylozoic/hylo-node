'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('projects', function(table) {
    table.string('slug').unique().notNullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects', function(table) {
    table.dropColumn('slug');
  });
};
