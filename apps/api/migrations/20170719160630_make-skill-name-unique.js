exports.up = function (knex, Promise) {
  return knex.schema.alterTable('skills', table => {
    table.unique('name')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('skills', table => {
    table.dropUnique('name')
  })
}
