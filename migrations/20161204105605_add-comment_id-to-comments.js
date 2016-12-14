'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('comments', table => {
    table.bigInteger('comment_id').references('id').inTable('comments')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('comments', table => {
    table.dropColumn('comment_id')
  })
}
