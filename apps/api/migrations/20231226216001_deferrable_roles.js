exports.up = async function(knex, Promise) {
  await knex.raw('alter table groups_roles alter constraint groups_roles_group_id_foreign deferrable initially deferred')
  await knex.raw('alter table members_roles alter constraint members_roles_group_id_foreign deferrable initially deferred')
  await knex.raw('alter table members_roles alter constraint members_roles_user_id_foreign deferrable initially deferred')
  await knex.raw('alter table members_roles alter constraint members_roles_group_role_id_foreign deferrable initially deferred')
}

exports.down = async function(knex, Promise) {
}
