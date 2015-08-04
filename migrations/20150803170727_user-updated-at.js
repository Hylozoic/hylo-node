'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => table.datetime('updated_at'));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => table.dropColumn('updated_at'));
};
