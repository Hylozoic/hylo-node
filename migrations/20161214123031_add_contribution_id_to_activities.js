'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('activities', table => {
    table.bigInteger('contribution_id').references('id').inTable('contributions')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('activities', table => {
    table.dropColumn('contribution_id')
  })
}
