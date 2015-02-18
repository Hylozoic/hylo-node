'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('tours', function(table) {
    table.increments().primary();
    table.bigInteger('user_id').references('id').inTable('users');
    table.string('type');
    table.json('status');
    table.timestamps();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('tours');
};
