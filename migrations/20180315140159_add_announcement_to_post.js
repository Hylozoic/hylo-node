
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', t => {
    t.boolean('announcement').defaultTo(false)
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', t => t.dropColumn('announcement'))
};
