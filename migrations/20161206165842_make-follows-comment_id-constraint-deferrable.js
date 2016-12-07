exports.up = function(knex, Promise) {
  return knex.raw('ALTER TABLE follows ALTER CONSTRAINT follows_comment_id_foreign DEFERRABLE INITIALLY DEFERRED')
}

exports.down = function(knex, Promise) {

}
