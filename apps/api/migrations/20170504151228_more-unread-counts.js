
exports.up = function (knex, Promise) {
  return knex.schema.table('communities_users', t => {
    t.integer('new_post_count').defaultTo(0)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('communities_users', t =>
    t.dropColumn('new_post_count'))
}
