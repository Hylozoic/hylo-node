'use strict';

exports.up = function(knex, Promise) {
    return knex.schema.createTable('financial_request', function(table) {
        table.increments().primary();
        table.bigInteger('post_id').references('id').inTable('post');
        table.decimal('amount', 8, 2);
        table.timestamps();
    });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('financial_request')
};
