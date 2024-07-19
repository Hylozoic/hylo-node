exports.up = async function(knex) {
  await knex.schema.createTable('group_widgets', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').index().notNullable()
    table.bigInteger('widget_id').references('id').inTable('widgets').notNullable()
    table.jsonb('settings').defaultTo('{}')
    table.boolean('is_visible').defaultTo(true)
    table.integer('order')

    table.timestamp('created_at')
  })

  const groups = await knex.raw(`SELECT id from groups;`)
  const groupIds = groups.rows.map(r => r.id)
  const widgetIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const now = new Date().toISOString()

  for (let i = 0; i < groupIds.length; i++) {
    const id = groupIds[i]
    let sql = 'INSERT INTO "public"."group_widgets"("group_id","widget_id", "order", "created_at") VALUES '
    widgetIds.forEach(w => sql = sql + `(${id}, ${w}, ${w}, '${now}'),`)
    sql = sql.replace(/,$/,';')
    await knex.raw(sql)
  }
}

exports.down = function(knex) {
  return knex.schema.dropTable('group_widgets')
}
