'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users', function(table) {
    table.boolean('push_follow_preference').defaultTo(true);
    table.boolean('push_new_post_preference').defaultTo(true);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('push_follow_preference');
    table.dropColumn('push_new_post_preference');
  });
};
