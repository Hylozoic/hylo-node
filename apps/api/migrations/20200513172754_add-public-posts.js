
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.boolean('is_public').defaultTo(false)
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.dropColumn('is_public')
  })
};
