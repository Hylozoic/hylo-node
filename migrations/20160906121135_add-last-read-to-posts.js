'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('posts_users', function (table) {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('post_id').references('id').inTable('post')
    table.timestamp('last_read_at')
    table.timestamps()
  })  
};

exports.down = function(knex, Promise) {
 return knex.schema.dropTable('posts_users') 
};
