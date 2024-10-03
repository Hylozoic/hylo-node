
exports.up = async function (knex) {
  await knex.schema.createTable('custom_views', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups')
    table.boolean('is_active').defaultTo(true)
    table.string('search_text')
    table.string('icon')
    table.string('name')
    table.string('external_link')
    table.string('view_mode')
    table.boolean('active_posts_only')
    table.specificType('post_types', 'character varying(255)[]')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.integer('order').notNullable()
  })

  await knex.schema.createTable('custom_view_topics', table => {
    table.increments().primary()
    table.bigInteger('custom_view_id').references('id').inTable('custom_views').notNullable()
    table.bigInteger('tag_id').references('id').inTable('tags').notNullable()
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('custom_views')
  return knex.schema.dropTable('custom_view_topics')
}
