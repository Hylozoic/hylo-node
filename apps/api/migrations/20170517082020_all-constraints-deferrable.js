const constraints = [
  { table: 'activities', constraint: 'activities_contribution_id_foreign' },
  { table: 'activities', constraint: 'activities_parent_comment_id_foreign' },
  { table: 'activities', constraint: 'activity_community_id_foreign' },
  { table: 'comments', constraint: 'comments_comment_id_foreign' },
  { table: 'communities_tags', constraint: 'communities_tags_owner_id_foreign' },
  { table: 'community_invites', constraint: 'community_invite_tag_id_foreign' },
  { table: 'event_responses', constraint: 'event_responses_post_id_foreign' },
  { table: 'event_responses', constraint: 'event_responses_user_id_foreign' },
  { table: 'posts', constraint: 'post_parent_post_id_foreign' },
  { table: 'user_connections', constraint: 'user_connections_other_user_id_foreign' },
  { table: 'user_connections', constraint: 'user_connections_user_id_foreign' },
  { table: 'user_external_data', constraint: 'user_external_data_user_id_foreign' }
]

exports.up = function (knex, Promise) {
  return Promise.all(
    constraints.map(c => knex.raw(
      `ALTER TABLE ${c.table} ALTER CONSTRAINT ${c.constraint} DEFERRABLE INITIALLY DEFERRED`
    ))
  )
}

exports.down = function (knex, Promise) {
  return Promise.all(
    constraints.map(c => knex.raw(
      `ALTER TABLE ${c.table} ALTER CONSTRAINT ${c.constraint} NOT DEFERRABLE`
    ))
  )
}
