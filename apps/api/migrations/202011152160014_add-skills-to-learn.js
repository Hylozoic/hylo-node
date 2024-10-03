
exports.up = function(knex, Promise) {
  return knex.schema.table('skills_users', t => {
    t.integer('type').defaultTo(0)
  })
  .then(() => knex.raw(`ALTER TABLE skills_users DROP CONSTRAINT skills_users_skill_id_user_id_unique`))
  .then(() => knex.raw(`ALTER TABLE skills_users ADD CONSTRAINT skills_users_skill_id_user_id_type_unique UNIQUE (skill_id, user_id, type);`))
}

exports.down = function(knex, Promise) {
  return knex.schema.table('skills_users', t => {
    t.dropColumn('type')
  })
  .then(() => knex.raw(`ALTER TABLE skills_users ADD CONSTRAINT skills_users_skill_id_user_id_unique UNIQUE (skill_id, user_id);`))
}
