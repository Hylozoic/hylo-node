
exports.up = function(knex, Promise) {
  return knex.raw(
    `CREATE INDEX public_posts_idx ON posts USING btree (is_public);`
  )
};

exports.down = function(knex, Promise) {
  return knex.raw(
    `DROP INDEX public_posts_idx;`
  )
};
