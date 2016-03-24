'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.createTable('posts_tags', function (table) {
      table.increments()
      table.bigInteger('post_id').references('id').inTable('post')
      table.bigInteger('tag_id').references('id').inTable('tags')
      table.timestamps()
    }),

    knex.schema.createTable('communities_tags', function (table) {
      table.increments()
      table.bigInteger('community_id').references('id').inTable('community')
      table.bigInteger('tag_id').references('id').inTable('tags')
      table.timestamps()
    }),

    knex.schema.createTable('tags_users', function (table) {
      table.increments()
      table.bigInteger('tag_id').references('id').inTable('tags')
      table.bigInteger('user_id').references('id').inTable('users')
      table.timestamps()
    })
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('posts_tags'),
    knex.schema.dropTable('communities_tags'),
    knex.schema.dropTable('tags_users')
  )
}
