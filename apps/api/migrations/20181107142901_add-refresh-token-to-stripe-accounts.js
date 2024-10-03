
exports.up = function(knex, Promise) {
  return knex.schema.table('stripe_accounts', table => {
    table.string('refresh_token')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('stripe_accounts', table => {
    table.dropColumn('refresh_token')
  })
};
