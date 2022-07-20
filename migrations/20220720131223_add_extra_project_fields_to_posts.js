
exports.up = function (knex) {
  return knex.schema.table('posts', table => {
    table.string('donations_link')
    table.string('project_management_link')
  })
}

exports.down = function (knex) {
  return knex.schema.table('posts', table => {
    table.dropColumn('project_management_link')
    table.dropColumn('donations_link')
  })
}
