'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('followed_tags', function (table) {
    table.increments()
    table.bigInteger('community_id').references('id').inTable('community')
    table.bigInteger('tag_id').references('id').inTable('tags')
    table.bigInteger('user_id').references('id').inTable('users')
    table.unique(['community_id', 'tag_id', 'user_id'])
    table.timestamps()
  })
  .then(() => Promise.join(
    knex.raw('ALTER TABLE followed_tags ALTER CONSTRAINT followed_tags_community_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE followed_tags ALTER CONSTRAINT followed_tags_tag_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE followed_tags ALTER CONSTRAINT followed_tags_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('followed_tags')
}
