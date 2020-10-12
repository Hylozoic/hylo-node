
exports.up = function(knex, Promise) {
  return knex.schema.createTable('saved_searches', table => {
    table.increments().primary()

    table.bigInteger('user_id').references('id').inTable('users').index().notNullable()
    table.string('name')
    table.string('context').notNullable()
    table.bigInteger('context_id').comment('If context is \"community\" or \"network\", this represents the community or network id')
    table.boolean('is_active').defaultTo(true)
    table.string('search_text')
    table.specificType('post_types', 'character varying(255)[]')
    table.specificType('bounding_box', 'geometry(polygon, 4326)')
    table.bigInteger('last_post_id').references('id').inTable('posts')

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('saved_searches')
}
