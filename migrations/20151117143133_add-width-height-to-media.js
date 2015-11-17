'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('media', table => {
    table.integer('width')
    table.integer('height')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('media', table => {
    table.dropColumn('width')
    table.dropColumn('height')
  })
}
