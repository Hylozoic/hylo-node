exports.up = function (knex, Promise) {
  return knex.schema.createTable('skills_users', table => {
    table.increments().primary()
    table.bigInteger('skill_id').references('id').inTable('skills')
    table.bigInteger('user_id').references('id').inTable('users')
  })
  .then(() => Promise.join(
    knex.raw('alter table skills_users alter constraint skills_users_skill_id_foreign deferrable initially deferred'),
    knex.raw('alter table skills_users alter constraint skills_users_user_id_foreign deferrable initially deferred')
  ))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('skills_users')
}
