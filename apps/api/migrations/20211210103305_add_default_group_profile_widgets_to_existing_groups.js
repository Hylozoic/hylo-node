
exports.up = async function (knex) {
  // The mission, topics and join widgets need to be added to the existing groups
  const result = await knex.raw(`
    select id from groups where type IS NULL
  `)

  const groupIds = result.rows.map((row) => parseInt(row.id))
  let query = `INSERT INTO group_widgets (group_id, widget_id, "order", created_at, context)
  VALUES
  `
  groupIds.forEach((groupId) => {
    query = query + `
    (${groupId}, 19, 1, current_timestamp, 'group_profile'),
    (${groupId}, 20, 2, current_timestamp, 'group_profile'),
    (${groupId}, 21, 3, current_timestamp, 'group_profile'),`
  })

  query = query.slice(0, -1)
  await knex.raw(query)
}

exports.down = async function (knex) {
  const result = await knex.raw(`
    select id from groups where type IS NULL
  `)

  const groupIds = result.rows.map((row) => parseInt(row.id))

  const query = `DELETE from group_widgets where context = 'group_profile' AND group_id IN (${groupIds.join()})`

  await knex.raw(query)
}
