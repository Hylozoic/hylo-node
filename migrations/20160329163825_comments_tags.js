'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('comments_tags', function (table) {
    table.increments()
    table.bigInteger('comment_id').references('id').inTable('comment')
    table.bigInteger('tag_id').references('id').inTable('tags')
    table.timestamps()
  })
  .then(() => Promise.join(
    knex.raw('ALTER TABLE comments_tags ALTER CONSTRAINT comments_tags_comment_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE comments_tags ALTER CONSTRAINT comments_tags_tag_id_foreign DEFERRABLE INITIALLY DEFERRED')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('comments_tags')
}
