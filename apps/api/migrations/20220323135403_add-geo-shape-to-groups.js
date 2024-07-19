
exports.up = function (knex) {
  return knex.schema.table('groups', table => {
    table.specificType('geo_shape', 'geometry(polygon, 4326)');
  })
}

exports.down = function (knex) {
  return knex.schema.table('groups', table => {
    table.dropColumn('geo_shape')
  })
}
