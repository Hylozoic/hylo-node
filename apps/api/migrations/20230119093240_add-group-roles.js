
exports.up = async function(knex) {
  await knex.schema.createTable('groups_roles', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups')
    table.string('name')
    table.string('emoji')
    table.string('color')
    table.string('description')
    table.boolean('active')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.index(['group_id'])
  })

  await knex.schema.createTable('members_roles', table => {
    table.increments().primary()
    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.bigInteger('group_role_id').references('id').inTable('groups_roles').notNullable()
    table.boolean('active')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.index(['group_id', 'user_id'])
  })
};

exports.down = async function(knex) {
  await knex.schema.table('groups_roles', table => {
    table.dropIndex(['group_id'])
  })
  await knex.schema.table('members_roles', table => {
    table.dropIndex(['group_id', 'user_id'])
  })
  await knex.schema.dropTable('groups_roles')
  return knex.schema.dropTable('members_roles')
};
