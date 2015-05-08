'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('projects', table => table.string('thumbnail_url'));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects', table => table.dropColumn('thumbnail_url'));
};
