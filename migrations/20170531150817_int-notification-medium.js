
exports.up = function (knex, Promise) {
  return knex.schema.table('notifications', t => {
    t.integer('medium_int')
  })
  .then(() => knex.raw("update notifications set medium_int = 0 where medium = 'in-app'"))
  .then(() => knex.raw("update notifications set medium_int = 1 where medium = 'push'"))
  .then(() => knex.raw("update notifications set medium_int = 2 where medium = 'email'"))
  .then(() => knex.schema.table('notifications', t => {
    t.dropColumn('medium')
    t.renameColumn('medium_int', 'medium')
  }))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('notifications', t => {
    t.string('medium_str')
  })
  .then(() => knex.raw("update notifications set medium_str = 'in-app' where medium = 0"))
  .then(() => knex.raw("update notifications set medium_str = 'push' where medium = 1"))
  .then(() => knex.raw("update notifications set medium_str = 'email' where medium = 2"))
  .then(() => knex.schema.table('notifications', t => {
    t.dropColumn('medium')
    t.renameColumn('medium_str', 'medium')
  }))
}
