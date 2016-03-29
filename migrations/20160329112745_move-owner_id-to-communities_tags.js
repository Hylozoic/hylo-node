'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('tags', table => {
      table.dropColumn('owner_id')
    }),
    knex.schema.table('communities_tags', table => {
      table.bigInteger('owner_id').references('id').inTable('users')
    })
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('communities_tags', table => {
      table.dropColumn('owner_id')
    }),
    knex.schema.table('tags', table => {
      table.bigInteger('owner_id').references('id').inTable('users')
    })
  )
}
