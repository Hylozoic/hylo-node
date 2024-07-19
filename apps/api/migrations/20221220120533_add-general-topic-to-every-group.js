exports.up = async function (knex) {
  // Add a default #general topic to every group
  const q = knex.select('id').from('tags').where('name', 'general')
  const tagId = await q.pluck('id')

  const groups = await knex.raw(`
    select id, num_members from groups;
  `)

  groups.rows.forEach(async (row) => {
    const groupId = parseInt(row.id)
    const numMembers = parseInt(row.num_members || 0)
    let query = `INSERT INTO groups_tags (group_id, tag_id, is_default, visibility, num_followers, created_at, updated_at)
                 VALUES (${groupId}, ${tagId}, true, 2, ${numMembers}, current_timestamp, current_timestamp)
                 ON CONFLICT (group_id, tag_id)
                 DO UPDATE set num_followers = ${numMembers}, is_default = true, visibility = 2, updated_at = current_timestamp;`
    await knex.raw(query)
  })

  // Subscribe every user to every group's general topic
  const memberships = await knex.raw(`
    select id, user_id, group_id from group_memberships;
  `)
  memberships.rows.forEach(async (row) => {
    const userId = parseInt(row.user_id)
    const groupId = parseInt(row.group_id)
    let query = `INSERT INTO tag_follows (group_id, user_id, tag_id, new_post_count, created_at, updated_at)
                 VALUES (${groupId}, ${userId}, ${tagId}, 0, current_timestamp, current_timestamp) ON CONFLICT DO NOTHING;`
    await knex.raw(query)
  })

}

exports.down = function (knex) {
  
}
