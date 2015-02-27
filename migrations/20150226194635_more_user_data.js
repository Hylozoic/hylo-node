'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.createTable('phones', function(table) {
      table.increments().primary();
      table.bigInteger('user_id').references('id').inTable('users');
      table.string('value');
    }),
    knex.schema.createTable('emails', function(table) {
      table.increments().primary();
      table.bigInteger('user_id').references('id').inTable('users');
      table.string('value');
    }),
    knex.schema.createTable('websites', function(table) {
      table.increments().primary();
      table.bigInteger('user_id').references('id').inTable('users');
      table.string('value');
    }),
    knex.schema.table('users', function(table) {
      table.text('work');
      table.text('intention');
      table.text('extra_info');
    }),
    knex.schema.table('users_skill', function(table) {
      table.renameColumn('users_id', 'user_id');
    }),
    knex.schema.table('users_org', function(table) {
      table.renameColumn('users_id', 'user_id');
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.join(
    Promise.map(['phones', 'emails', 'websites'], function(table) {
      return knex.schema.dropTable(table);
    }),
    knex.schema.table('users', function(table) {
      table.dropColumns('work', 'intention', 'extra_info');
    }),
    knex.schema.table('users_skill', function(table) {
      table.renameColumn('user_id', 'users_id');
    }),
    knex.schema.table('users_org', function(table) {
      table.renameColumn('user_id', 'users_id');
    })
  );
};
