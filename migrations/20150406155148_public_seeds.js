'use strict';

exports.up = function(knex, Promise) {
  knex.schema.table('post', function(table) {
    table.integer('visibility').defaultTo(0);
  })
};

exports.down = function(knex, Promise) {
  knex.schema.table('post', function(table) {
    table.dropColumn('visibility');
  })
};
