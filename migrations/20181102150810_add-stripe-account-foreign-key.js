
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.bigInteger('stripe_account_id').references('id').inTable('stripe_accounts')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('stripe_account_id')
  })
};
