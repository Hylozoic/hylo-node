'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('posts_projects'),
    knex.schema.dropTable('project_invitations'),
    knex.schema.dropTable('projects_users'),

    knex.schema.createTable('posts_projects', function(table) {
      table.increments();
      table.bigInteger('post_id').references('id').inTable('post').notNullable();
      table.bigInteger('project_id').references('id').inTable('projects').notNullable();
      table.timestamps();
    }),

    knex.schema.createTable('project_invitations', function(table) {
      table.increments();
      table.string('email');
      table.bigInteger('user_id').references('id').inTable('users');
      table.bigInteger('project_id').references('id').inTable('projects').notNullable();
      table.datetime('accepted_at');
      table.timestamps();
    }),

    knex.schema.createTable('projects_users', function(table) {
      table.increments();
      table.bigInteger('project_id').references('id').inTable('post').notNullable();
      table.bigInteger('user_id').references('id').inTable('users').notNullable();
      table.timestamps();
    })
  )
};

exports.down = function(knex, Promise) {

};
