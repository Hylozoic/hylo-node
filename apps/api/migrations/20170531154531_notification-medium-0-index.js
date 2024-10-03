
exports.up = function (knex, Promise) {
  return knex.raw('create index notifications_pk_medium_0 on notifications (id) where medium = 0')
}

exports.down = function (knex, Promise) {
  return knex.raw('drop index notifications_pk_medium_0')
}
