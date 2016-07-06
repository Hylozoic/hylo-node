'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('post_community', table => {
    table.boolean('pinned').defaultTo(false)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('post_community', table => {
    table.dropColumn('pinned')
  })
}
