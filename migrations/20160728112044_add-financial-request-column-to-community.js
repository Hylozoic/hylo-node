'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', table => {
    table.boolean('financial_requests_enabled').defaultTo(false)
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', table => {
    table.dropColumns('financial_requests_enabled')
  })
};
