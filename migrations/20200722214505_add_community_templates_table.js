exports.up = async function(knex, Promise) {
  await knex.schema.createTable('community_templates', table => {
    table.increments().primary()

    table.string('name')
    table.string('display_name')
    table.index(['name'])

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.createTable('community_template_default_topics', table => {
    table.increments().primary()

    table.bigInteger('community_template_id').references('id').inTable('community_templates')
    table.bigInteger('tag_id').references('id').inTable('tags')
    table.index(['community_template_id'])

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  return knex.schema.table('communities', table => {
    table.bigInteger('community_template_id').references('id').inTable('community_templates')
  })
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('community_templates')
  await knex.schema.dropTable('community_template_default_topics')

  return knex.schema.table('communities', table => {
    table.dropColumn('community_template_id')
  })
};