'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.raw('ALTER TABLE communities_tags ALTER CONSTRAINT communities_tags_community_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE communities_tags ALTER CONSTRAINT communities_tags_tag_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE posts_tags ALTER CONSTRAINT posts_tags_post_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE posts_tags ALTER CONSTRAINT posts_tags_tag_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE tags_users ALTER CONSTRAINT tags_users_tag_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE tags_users ALTER CONSTRAINT tags_users_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  )
}

exports.down = function (knex, Promise) {

}
