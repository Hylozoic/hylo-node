'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('notifications', table => {
    table.dropColumn('media')
    table.string('medium')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('notifications', table => {
    table.dropColumn('medium')
    table.string('media')
  })
}
