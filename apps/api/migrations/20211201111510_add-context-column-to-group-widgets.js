
exports.up = async function (knex) {
  await knex.schema.table('group_widgets', t => {
    t.string('context')
  })

  const now = new Date().toISOString()

  await knex.raw(`
  INSERT INTO "public"."widgets"("id","name","created_at") VALUES
    (15,E'opportunities_to_collaborate','${now}'),
    (16,E'farm_map','${now}'),
    (17,E'moderators','${now}'),
    (18,E'privacy_settings','${now}'),
    (19,E'mission','${now}'),
    (20,E'topics','${now}'),
    (21,E'join','${now}');
  `)

  return knex.raw(`
    UPDATE group_widgets SET context = 'landing' WHERE context IS NULL;
  `)
}

exports.down = async function (knex) {
  await knex.raw(`
    DELETE FROM widgets WHERE name IN ('opportunities_to_collaborate', 'farm_map', 'moderators', 'privacy_settings');
  `)
  return knex.schema.table('group_widgets', table => {
    table.dropColumn('context')
  })
}
