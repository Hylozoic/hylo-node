'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users_community', table => table.renameColumn('users_id', 'user_id'));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users_community', table => table.renameColumn('user_id', 'users_id'));
};
