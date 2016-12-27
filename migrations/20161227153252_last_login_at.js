exports.up = function (knex, Promise) {
  return knex.schema.table('users', t => t.renameColumn('last_login', 'last_login_at'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('users', t => t.renameColumn('last_login_at', 'last_login'))
}
