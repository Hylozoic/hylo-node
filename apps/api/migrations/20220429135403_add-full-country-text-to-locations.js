
exports.up = function (knex) {
  return knex.schema.table('locations', table => {
    table.renameColumn('country', 'country_code')
  }).then(() => knex.schema.table('locations', table => {
    table.string('country')
  }))
}

exports.down = function (knex) {
  return knex.schema.table('locations', table => {
    table.dropColumn('country')
  }).then(() => knex.schema.table('locations', table => {
    table.renameColumn('country_code', 'country')
  }))
}
