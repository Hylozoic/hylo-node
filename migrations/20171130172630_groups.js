
function setDeferrable (knex, table, constraint) {
  return knex.raw(`ALTER TABLE ${table} ALTER CONSTRAINT ${constraint} DEFERRABLE INITIALLY DEFERRED`)
}

exports.up = function (knex, Promise) {
  return knex.schema.createTable('groups', t => {
    t.bigIncrements().primary()
    t.string('group_data_type')
    t.bigInteger('group_data_id')
    t.boolean('active').defaultTo(true)
    t.timestamps()
    t.unique(['group_data_id', 'group_data_type'])
  })
  .then(() => knex.schema.createTable('group_connections', t => {
    t.bigIncrements().primary()
    t.bigInteger('parent_group_id').references('id').inTable('groups')
    t.bigInteger('child_group_id').references('id').inTable('groups')
    t.boolean('active').defaultTo(true)
    t.integer('role')
    t.jsonb('settings')
    t.timestamps()
    t.unique(['parent_group_id', 'child_group_id'])
  }))
  .then(() => setDeferrable(knex, 'group_connections', 'group_connections_child_group_id_foreign'))
  .then(() => setDeferrable(knex, 'group_connections', 'group_connections_parent_group_id_foreign'))
  .then(() => knex.schema.createTable('group_memberships', t => {
    t.bigIncrements().primary()
    t.bigInteger('group_id').references('id').inTable('groups')
    t.bigInteger('user_id').references('id').inTable('users')
    t.boolean('active').defaultTo(true)
    t.integer('role')
    t.jsonb('settings')
    t.timestamps()
    t.unique(['group_id', 'user_id'])
  }))
  .then(() => setDeferrable(knex, 'group_memberships', 'group_memberships_group_id_foreign'))
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('group_connections')
  .then(() => knex.schema.dropTable('group_memberships'))
  .then(() => knex.schema.dropTable('groups'))
}
