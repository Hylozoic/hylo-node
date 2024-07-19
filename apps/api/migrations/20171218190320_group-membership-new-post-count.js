exports.up = function (knex, Promise) {
  // ideally we would put this value in settings as well, because it's not quite
  // right to think of new post count as something that every group has (e.g.
  // a post group would more properly have new comment count).
  //
  // but this is a value that we need to update efficiently for many rows, i.e.
  // when a new post is created, we increment new_post_count for all groups that
  // it is part of. and we are currently on postgres 9.4, which doesn't have
  // a good way of doing this for values in JSONB columns.
  return knex.schema.table('group_memberships', t => {
    t.integer('new_post_count')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('group_memberships', t =>
    t.dropColumn('new_post_count'))
}
