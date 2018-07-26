exports.up = function (knex, Promise) {
  return knex.schema.createTable('project_roles', t => {
    t.bigIncrements().primary()
    t.string('name')
  })
  .then(() => knex.schema.table('group_memberships', t =>
    t.bigInteger('project_role_id').references('id').inTable('project_roles'))
    .then(() => knex.raw('alter table group_memberships alter constraint group_memberships_project_role_id_foreign deferrable initially deferred'))
  )
}

exports.down = function (knex, Promise) {
  return knex.schema.table('group_memberships', t => t.dropColumn('project_role_id'))
  .then(() => knex.schema.dropTable('project_roles'))
}
