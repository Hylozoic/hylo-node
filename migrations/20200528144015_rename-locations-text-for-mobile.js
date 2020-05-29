
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.renameColumn('location_text', 'location')
  }).then(() => knex.schema.table('posts', table => {
    table.renameColumn('location_text', 'location')
  })).then(() => knex.schema.table('communities', table => {
    table.renameColumn('location_text', 'location')
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.renameColumn('location', 'location_text')
  }).then(() => knex.schema.table('posts', table => {
    table.renameColumn('location', 'location_text')
  })).then(() => knex.schema.table('communities', table => {
    table.renameColumn('location', 'location_text')
  }))
};
