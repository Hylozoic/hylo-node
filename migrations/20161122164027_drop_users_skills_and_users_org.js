exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('users_skill'),
    knex.schema.dropTable('users_org')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.createTable('users_skill', function (table) {
      table.increments()
      table.bigInteger('user_id').references('id').inTable('users')
      table.string('skill_name')
    }),
    knex.schema.createTable('users_org', function (table) {
      table.increments()
      table.bigInteger('user_id').references('id').inTable('users')
      table.string('org_name')
    })
  )
}
