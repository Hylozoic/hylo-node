'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('notifications', t => t.datetime('failed_at')) 
}

exports.down = function (knex, Promise) {
  return knex.schema.table('notifications', t => t.dropColumn('failed_at')) 
}
