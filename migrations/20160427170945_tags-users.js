'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('tags_users', function (table) {
    table.increments()
    table.bigInteger('tag_id').references('id').inTable('tags')
    table.bigInteger('user_id').references('id').inTable('users')
    table.timestamps()
  })
  .then(() => Promise.join(
    knex.raw('alter table tags_users add constraint unique_tags_users unique (tag_id, user_id)'),
    knex.raw('ALTER TABLE tags_users ALTER CONSTRAINT tags_users_tag_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE tags_users ALTER CONSTRAINT tags_users_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('tags_users')
}
