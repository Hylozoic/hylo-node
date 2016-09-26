'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('default')
    table.boolean('def').defaultTo(false)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('def')
    table.boolean('default').defaultTo(false)
  })
}
