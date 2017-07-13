exports.up = function (knex, Promise) {
  return knex.schema.createTable('networks_posts', table => {
    table.increments().primary()
    table.bigInteger('network_id').references('id').inTable('networks')
    table.bigInteger('post_id').references('id').inTable('posts')
  })
  .then(() => Promise.join(
    knex.raw('alter table networks_posts alter constraint networks_posts_network_id_foreign deferrable initially deferred'),
    knex.raw('alter table networks_posts alter constraint networks_posts_post_id_foreign deferrable initially deferred')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('networks_posts')
}
