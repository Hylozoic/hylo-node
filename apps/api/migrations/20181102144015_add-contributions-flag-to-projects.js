
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.boolean('accept_contributions').defaultTo(false)
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.dropColumn('accept_contributions')
  })
};
