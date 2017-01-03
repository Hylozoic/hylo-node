exports.up = function (knex, Promise) {
  return knex.schema.table('community_invites', table => {
    table.dateTime('last_sent_at')
    table.integer('sent_count').defaultTo(0)
    table.string('subject')
    table.text('message')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('community_invites', table => {
    table.dropColumn('last_sent_at')
    table.dropColumn('sent_count')
    table.dropColumn('subject')
    table.dropColumn('message')
  })
}
