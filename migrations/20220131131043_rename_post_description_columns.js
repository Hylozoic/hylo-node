
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.renameColumn('description', 'description_html')
  }).then(() => knex.schema.table('posts', table => {
    table.renameColumn('description_raw', 'description')
  }))
}

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.renameColumn('description', 'description_raw')
  }).then(() => knex.schema.table('posts', table => {
    table.renameColumn('description_html', 'description')
  }))
}
