exports.up = function (knex, Promise) {
  return knex.schema.table('communities', table =>
    table.dropColumn('hidden'))
  .then(() => knex.schema.table('communities', table =>
    table.boolean('hidden').notNullable().defaultTo(false)))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities', table =>
    table.dropColumn('hidden'))
  .then(() => knex.schema.table('communities', table =>
    table.boolean('hidden')))
}
