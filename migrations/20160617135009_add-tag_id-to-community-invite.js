'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('community_invite', table => {
    table.bigInteger('tag_id').references('id').inTable('tags')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('community_invite', table => {
    table.dropColumn('tag_id')
  })
}
