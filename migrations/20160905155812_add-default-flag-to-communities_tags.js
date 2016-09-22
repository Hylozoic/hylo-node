'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.boolean('default').defaultTo(false)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('default')
  })
}
