'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('activity', function(table) {
    table.increments().primary();
    table.bigInteger('actor_id').references('id').inTable('users');
    table.bigInteger('reader_id').references('id').inTable('users');
    table.bigInteger('post_id').references('id').inTable('post');
    table.bigInteger('comment_id').references('id').inTable('comment');
    table.string('action');
    table.boolean('unread').defaultTo(true);
    table.timestamps();
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('activity');
};
