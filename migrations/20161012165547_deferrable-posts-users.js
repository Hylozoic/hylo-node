exports.up = function (knex, Promise) {
  return Promise.join(
    knex.raw('ALTER TABLE posts_users ALTER CONSTRAINT posts_users_post_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE posts_users ALTER CONSTRAINT posts_users_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  )
}

exports.down = function (knex, Promise) {}
