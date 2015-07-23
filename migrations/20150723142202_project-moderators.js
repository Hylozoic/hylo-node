'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('projects_users', table => table.integer('role').defaultTo(0));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects_users', table => table.dropColumn('role'));
};
