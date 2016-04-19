'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('tags', function (table) {
      table.dropColumn('description')
    }),
    knex.schema.table('communities_tags', function (table) {
      table.text('description')
    }),
    knex.schema.dropTable('tags_users')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('communities_tags', function (table) {
      table.dropColumn('description')
    }),
    knex.schema.table('tags', function (table) {
      table.text('description')
    }),
    knex.schema.createTable('tags_users', function (table) {
      table.increments()
      table.bigInteger('tag_id').references('id').inTable('tags')
      table.bigInteger('user_id').references('id').inTable('users')
      table.timestamps()
    })
  )
}
