exports.up = async function (knex, Promise) {
  await knex.raw('alter table group_memberships_common_roles alter constraint group_memberships_common_roles_common_role_id_foreign deferrable initially deferred')
}

exports.down = async function (knex, Promise) {
}
