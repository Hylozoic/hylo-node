exports.up = function (knex, Promise) {
  return knex.schema.alterTable('skills_users', table => {
    table.unique(['skill_id', 'user_id'])
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('skills_users', table => {
    table.dropUnique(['skill_id', 'user_id'])
  })
}
