
exports.up = function (knex, Promise) {
  return knex.schema.table('media', t => {
    t.integer('position').defaultTo(0)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('media', t => {
    t.dropColumn('position')
  })
}
