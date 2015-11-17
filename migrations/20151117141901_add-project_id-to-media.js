'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('media', table => {
    table.bigInteger('project_id').references('id').inTable('projects')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('media', table => {
    table.dropColumn('project_id')
  })
}
