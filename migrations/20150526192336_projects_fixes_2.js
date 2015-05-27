'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('projects_users'),

    knex.schema.createTable('projects_users', function(table) {
      table.increments();
      table.bigInteger('project_id').references('id').inTable('projects').notNullable();
      table.bigInteger('user_id').references('id').inTable('users').notNullable();
      table.timestamps();
    })
  )
};

exports.down = function(knex, Promise) {

};
