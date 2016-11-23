exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('comments', function (table) {
      table.renameColumn('deactivated_on', 'deactivated_at')
    }),
    knex.schema.table('community_invites', function (table) {
      table.renameColumn('created', 'created_at')
      table.renameColumn('used_on', 'used_at')
    }),
    knex.schema.table('contributions', function (table) {
      table.renameColumn('date_contributed', 'contributed_at')
    }),
    knex.schema.table('follows', function (table) {
      table.renameColumn('date_added', 'added_at')
    }),
    knex.schema.table('posts', function (table) {
      table.renameColumn('deactivated_on', 'deactivated_at')
      table.renameColumn('start_time', 'starts_at')
      table.renameColumn('end_time', 'ends_at')
    }),
    knex.schema.table('push_notifications', function (table) {
      table.renameColumn('time_queued', 'queued_at')
      table.renameColumn('time_sent', 'sent_at')
    })
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('comments', function (table) {
      table.renameColumn('deactivated_at', 'deactivated_on')
    }),
    knex.schema.table('community_invites', function (table) {
      table.renameColumn('created_at', 'created')
      table.renameColumn('used_at', 'used_on')
    }),
    knex.schema.table('contributions', function (table) {
      table.renameColumn('contributed_at', 'date_contributed')
    }),
    knex.schema.table('follows', function (table) {
      table.renameColumn('added_at', 'date_added')
    }),
    knex.schema.table('posts', function (table) {
      table.renameColumn('deactivated_at', 'deactivated_on')
      table.renameColumn('starts_at', 'start_time')
      table.renameColumn('ends_at', 'end_time')
    }),
    knex.schema.table('push_notifications', function (table) {
      table.renameColumn('time_queued', 'queued_at')
      table.renameColumn('time_sent', 'sent_at')
    })
  )
}
