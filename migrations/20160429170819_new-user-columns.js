'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('users', t => {
    t.string('location')
    t.string('url')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('users', t => {
    t.dropColumns('location', 'url')
  })
}
