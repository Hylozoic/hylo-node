
exports.up = function(knex, Promise) {
  return knex.schema.table('communities', table => {
    table.boolean('allow_community_invites').defaultTo(false)
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('communities', table => {
    table.dropColumn('allow_community_invites')
  })
};
