'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('tag_follows', table => {
    table.integer('new_post_count').defaultTo(0)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('tag_follows', table => {
    table.dropColumn('new_post_count')
  })
}
