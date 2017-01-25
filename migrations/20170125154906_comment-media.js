
exports.up = function(knex, Promise) {
  return knex.schema.table('media', t =>
    t.bigInteger('comment_id').references('id').inTable('comments'))
  .then(() => knex.raw('alter table media alter constraint media_comment_id_foreign deferrable initially deferred'))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('media', t => t.dropColumn('comment_id'))
};
