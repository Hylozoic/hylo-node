'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('post', t => {
    t.datetime('start_time')
    t.datetime('end_time')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('post', t => {
    t.dropColumns('start_time', 'end_time')
  })
}
