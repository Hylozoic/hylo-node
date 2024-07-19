exports.up = async function(knex) {
  await knex.schema.createTable('widgets', table => {
    table.increments().primary()
    table.string('name')
    table.timestamp('created_at')
  })

  const now = new Date().toISOString()

  await knex.raw(`
  INSERT INTO "public"."widgets"("id","name","created_at") VALUES
    (1,E'text_block','${now}'),
    (2,E'announcements','${now}'),
    (3,E'active_members','${now}'),
    (4,E'requests_offers','${now}'),
    (5,E'posts','${now}'),
    (6,E'community_topics','${now}'),
    (7,E'events','${now}'),
    (8,E'project_activity','${now}'),
    (9,E'group_affiliations','${now}'),
    (10,E'map','${now}');`);
}

exports.down = function(knex) {
  return knex.schema.dropTable('widgets')
}
