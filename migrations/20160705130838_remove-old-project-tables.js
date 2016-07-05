'use strict'

exports.up = (knex, Promise) =>
  Promise.join(
    knex.schema.dropTable('project_invitations'),
    knex.schema.dropTable('projects_users')
  )

exports.down = function (knex, Promise) {}
