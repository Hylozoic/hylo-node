'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.bigInteger('leader_id').references('id').inTable('users');
    table.text('welcome_message');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumns('leader_id', 'welcome_message');
  });
};