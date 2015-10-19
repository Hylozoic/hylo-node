'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('community_join_request', function(table) {
    table.increments().primary();
    table.bigInteger('user_id').references('id').inTable('users');
    table.bigInteger('community_id').references('id').inTable('community');
    table.datetime('created_at');
    table.unique(['user_id', 'community_id']);
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('community_join_request'); 
};
