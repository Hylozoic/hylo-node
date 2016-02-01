'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('devices', table => {
    table.string('version')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('devices', table => {
    table.dropColumn('version')
  })
}
