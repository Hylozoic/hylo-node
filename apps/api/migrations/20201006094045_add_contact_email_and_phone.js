exports.up = function(knex, Promise) {
  return knex.schema.table('users', t => {
    t.string('contact_email')
    t.string('contact_phone')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.table('users', t => {
    t.dropColumn('contact_email')
    t.dropColumn('contact_phone')
  })
}
