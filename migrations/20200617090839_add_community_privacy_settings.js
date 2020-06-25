
exports.up = function(knex, Promise) {
  return knex.schema.table('communities', table => {
    table.boolean('is_public').defaultTo(false)
  }).then(() => knex.schema.table('communities', table => {
    table.boolean('is_auto_joinable').defaultTo(false)
  })).then(() => knex.schema.table('communities', table => {
    table.boolean('public_member_directory').defaultTo(false)
  })).then(() => knex.raw(`CREATE INDEX public_communities_idx ON communities USING btree (is_public);`))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('communities', table => {
    table.dropColumn('is_public')
  }).then(() => knex.schema.table('communities', table => {
    table.dropColumn('is_auto_joinable')
  })).then(() => knex.schema.table('communities', table => {
    table.dropColumn('public_member_directory')
  })).then(() => knex.raw(`DROP INDEX public_communities_idx;`))
};
