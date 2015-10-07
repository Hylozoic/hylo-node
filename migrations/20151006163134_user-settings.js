'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('users', t => t.json('settings', true).defaultTo('{}'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('users', t => t.dropColumn('settings'))
}
