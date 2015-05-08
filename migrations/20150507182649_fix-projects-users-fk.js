'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('projects_users', table => {
    table.dropColumn('project_id');
  }).then(() => knex.schema.table('projects_users', table => {
    table.bigInteger('project_id').references('id').inTable('projects');
  }));
};

exports.down = function(knex, Promise) {

};
