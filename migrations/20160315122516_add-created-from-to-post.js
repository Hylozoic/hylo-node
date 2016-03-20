'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('post', table => {
    table.string('created_from')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('post', table => {
    table.dropColumn('created_from')
  })
}
