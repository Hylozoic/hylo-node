
exports.up = async function (knex) {
  await knex.schema.createTable('collections', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('group_id').references('id').inTable('groups')
    table.boolean('is_active').defaultTo(true)
    table.string('name').notNullable()
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.raw('alter table collections alter constraint collections_user_id_foreign deferrable initially deferred')
  await knex.raw('alter table collections alter constraint collections_group_id_foreign deferrable initially deferred')

  await knex.schema.createTable('collections_posts', table => {
    table.increments().primary()
    table.bigInteger('collection_id').references('id').inTable('collections').notNullable()
    table.bigInteger('post_id').references('id').inTable('posts').notNullable()
    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.integer('order').defaultsTo(0)
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.raw('alter table collections_posts alter constraint collections_posts_collection_id_foreign deferrable initially deferred')
  await knex.raw('alter table collections_posts alter constraint collections_posts_post_id_foreign deferrable initially deferred')
  await knex.raw('alter table collections_posts alter constraint collections_posts_user_id_foreign deferrable initially deferred')

  // Add deferrable to previous relationships
  await knex.raw('alter table custom_views alter constraint custom_views_group_id_foreign deferrable initially deferred')
  await knex.raw('alter table custom_view_topics alter constraint custom_view_topics_custom_view_id_foreign deferrable initially deferred')

  // Updates to Custom Views
  await knex.schema.table('custom_views', table => {
    table.bigInteger('collection_id').references('id').inTable('collections')
    table.renameColumn('view_mode', 'default_view_mode')
    table.string('default_sort')
    table.string('type')
  })
  await knex.raw('UPDATE custom_views SET type = (CASE WHEN default_view_mode=\'externalLink\' THEN \'externalLink\' ELSE \'stream\' END)')
  await knex.raw('alter table custom_views alter constraint custom_views_collection_id_foreign deferrable initially deferred')
  await knex.raw('UPDATE custom_views SET default_view_mode = \'cards\' WHERE default_view_mode=\'externalLink\'')
}

exports.down = async function (knex) {
  await knex.raw('UPDATE custom_views SET default_view_mode = \'externalLink\' WHERE type= \'externalLink\'')
  await knex.schema.table('custom_views', table => {
    table.renameColumn('default_view_mode', 'view_mode')
    table.dropColumn('collection_id')
    table.dropColumn('default_sort')
    table.dropColumn('type')
  })
  await knex.schema.dropTable('collections_posts')
  await knex.schema.dropTable('collections')
}
