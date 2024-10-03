
exports.up = function (knex, Promise) {
  return knex.schema.table('community_invites', table => {
    table.bigInteger('expired_by_id').references('id').inTable('users')
    table.timestamp('expired_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('community_invites', t => {
    t.dropColumn('expired_at')
    t.dropColumn('expired_by_id')
  })
}
