'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('users', t => t.dropColumn('daily_digest'))
}

exports.down = function (knex, Promise) {}
