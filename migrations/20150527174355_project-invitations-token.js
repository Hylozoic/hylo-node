'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('project_invitations', table => table.string('token'));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('project_invitations', table => table.dropColumn('token'));
};
