'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('projects_users', table => table.boolean('notify_on_new_posts').defaultTo(true));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('projects_users', table => table.dropColumn('notify_on_new_posts'));
};
