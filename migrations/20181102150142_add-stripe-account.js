exports.up = function (knex, Promise) {
  return knex.schema.createTable('stripe_accounts', t => {
    t.bigIncrements().primary()
    t.string('stripe_account_external_id')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('stripe_accounts')
}