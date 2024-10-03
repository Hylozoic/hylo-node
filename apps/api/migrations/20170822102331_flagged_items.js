exports.up = function (knex, Promise) {
  return knex.schema.createTable('flagged_items', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.string('category')
    table.text('reason')
    table.string('link')
  })
  .then(() =>
    knex.raw('alter table flagged_items alter constraint flagged_items_user_id_foreign deferrable initially deferred'))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('flagged_items')
}
