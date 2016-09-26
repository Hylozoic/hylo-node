'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('def')
    table.boolean('is_default').defaultTo(false)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('is_default')
    table.boolean('def').defaultTo(false)
  })
}
