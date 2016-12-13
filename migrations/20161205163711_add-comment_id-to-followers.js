'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('follows', table => {
    table.bigInteger('comment_id').references('id').inTable('comments')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('follows', table => {
    table.dropColumn('comment_id')
  })
}
