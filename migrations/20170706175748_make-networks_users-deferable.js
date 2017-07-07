
exports.up = function (knex, Promise) {
  return Promise.join(
    knex.raw('ALTER TABLE networks_users ALTER CONSTRAINT networks_users_network_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('ALTER TABLE networks_users ALTER CONSTRAINT networks_users_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.raw('ALTER TABLE networks_users ALTER CONSTRAINT networks_users_network_id_foreign NOT DEFERRABLE'),
    knex.raw('ALTER TABLE networks_users ALTER CONSTRAINT networks_users_user_id_foreign NOT DEFERRABLE')
  )
}
