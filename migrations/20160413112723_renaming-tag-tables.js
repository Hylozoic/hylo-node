'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('communities_tags', function (table) {
      table.renameColumn('owner_id', 'user_id')
    }),
    knex.schema.renameTable('followed_tags', 'tag_follows')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('communities_tags', function (table) {
      table.renameColumn('user_id', 'owner_id')
    }),
    knex.schema.renameTable('tag_follows', 'followed_tags')
  )
}
