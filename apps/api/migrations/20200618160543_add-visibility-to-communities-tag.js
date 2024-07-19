
exports.up = function(knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.integer('visibility').defaultTo(1)
  }).then(() => knex.schema.table('communities_tags', table => {
    table.index(['community_id', 'visibility'])
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('communities_tags', table => {
    table.dropColumn('visibility')
  })
};