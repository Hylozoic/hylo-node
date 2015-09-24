'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('media', t => t.string('name'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('media', t => t.dropColumn('name'))
}
