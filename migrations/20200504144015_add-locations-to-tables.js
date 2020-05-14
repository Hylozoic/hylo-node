
exports.up = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.bigInteger('location_id').references('id').inTable('locations')
    table.renameColumn('location', 'location_text')
  }).then(() => knex.schema.table('posts', table => {
    table.bigInteger('location_id').references('id').inTable('locations')
    table.renameColumn('location', 'location_text')
  })).then(() => knex.schema.table('communities', table => {
    table.bigInteger('location_id').references('id').inTable('locations')
    table.renameColumn('location', 'location_text')
  }))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users', table => {
    table.dropColumn('location_id')
    table.renameColumn('location_text', 'location')
  }).then(() => knex.schema.table('posts', table => {
    table.dropColumn('location_id')
    table.renameColumn('location_text', 'location')
  })).then(() => knex.schema.table('communities', table => {
    table.dropColumn('location_id')
    table.renameColumn('location_text', 'location')
  }))
};
