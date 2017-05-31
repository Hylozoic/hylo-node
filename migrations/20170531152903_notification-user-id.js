
exports.up = function (knex, Promise) {
  return knex.schema.table('notifications', t => {
    t.bigInteger('user_id').references('id').inTable('users')
  })
  .then(() => knex.raw(`update notifications set user_id = activities.reader_id
    from activities where activities.id = notifications.activity_id`))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('notifications', t => {
    t.dropColumn('user_id')
  })
}
