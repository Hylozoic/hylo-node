'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('posts_tags', table => {
    table.boolean('selected')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('posts_tags', table => {
    table.dropColumn('selected')
  })
}
