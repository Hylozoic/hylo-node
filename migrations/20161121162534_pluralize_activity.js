exports.up = function (knex, Promise) {
  return knex.schema.renameTable('activity', 'activities')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('activities', 'activity')
}
