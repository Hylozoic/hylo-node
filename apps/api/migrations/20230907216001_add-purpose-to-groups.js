
exports.up = function(knex, Promise) {
  return knex.schema.table('groups', t => {
    t.text('purpose')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.table('groups', t => {
    t.dropColumn('purpose')
  })
}
