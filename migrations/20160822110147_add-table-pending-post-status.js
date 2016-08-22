'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('pending_post_status', function(table) {
      table.increments().primary();
      table.string('transaction_id');
      table.string('status');
      table.timestamps();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('pending_post_status')
};
