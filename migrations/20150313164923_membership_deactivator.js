'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users_community', function(table) {
    table.timestamp('deactivated_at');
    table.bigInteger('deactivator_id').references('id').inTable('users');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users_community', function(table) {
    table.dropColumns('deactivated_at', 'deactivator_id');
  });

};
