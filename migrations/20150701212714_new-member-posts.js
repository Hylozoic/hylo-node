'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('posts_about_users', table => {
    table.bigInteger('post_id').references('id').inTable('post');
    table.bigInteger('user_id').references('id').inTable('users');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('posts_about_users');
};
