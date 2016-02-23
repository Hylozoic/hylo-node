'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('community', table => {
    table.boolean('active').defaultTo(true)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('community', table => {
    table.dropColumn('active')
  })
}
