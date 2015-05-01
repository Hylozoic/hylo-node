'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('projects', function(table) {
    table.increments();
    table.string('title').notNullable();
    table.string('intention');
    table.text('details');
    table.bigInteger('user_id').references('id').inTable('users');
    table.bigInteger('community_id').references('id').inTable('community');
    table.integer('visibility');
    table.string('image_url');
    table.string('video_url');
    table.datetime('published_at');
    table.timestamps();

  }).then(function() {
    return Promise.join(
      knex.schema.createTable('posts_projects', function(table) {
        table.increments();
        table.bigInteger('post_id').references('id').inTable('post');
        table.bigInteger('project_id').references('id').inTable('projects');
        table.timestamps();
      }),

      knex.schema.createTable('project_invitations', function(table) {
        table.increments();
        table.string('email');
        table.bigInteger('user_id').references('id').inTable('users');
        table.bigInteger('project_id').references('id').inTable('projects');
        table.datetime('accepted_at');
        table.timestamps();
      }),

      knex.schema.createTable('projects_users', function(table) {
        table.increments();
        table.bigInteger('project_id').references('id').inTable('post');
        table.bigInteger('user_id').references('id').inTable('users');
        table.timestamps();
      })
    );

  });
};

exports.down = function(knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('projects_users'),
    knex.schema.dropTable('project_invitations'),
    knex.schema.dropTable('posts_projects'),
    knex.schema.dropTable('projects')
  );
};
