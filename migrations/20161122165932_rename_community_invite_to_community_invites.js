exports.up = function (knex, Promise) {
  return knex.schema.renameTable('community_invite', 'community_invites')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('community_invites', 'community_invite')
}
