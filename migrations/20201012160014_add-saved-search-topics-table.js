
exports.up = function(knex, Promise) {
  return knex.schema.createTable('saved_search_topics', table => {
    table.increments().primary()

    table.bigInteger('tag_id').references('id').inTable('tags').notNullable()
    table.bigInteger('saved_search_id').references('id').inTable('saved_searches').index().notNullable()

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('saved_search_topics')
}
