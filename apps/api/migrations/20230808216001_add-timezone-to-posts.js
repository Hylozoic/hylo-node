
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', t => {
    t.string('timezone')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', t => {
    t.dropColumn('timezone')
  })
}
