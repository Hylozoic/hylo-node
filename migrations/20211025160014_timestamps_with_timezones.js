exports.up = async function(knex) {
  // Make group_data_type nullable for now, TODO: remove completely
  await knex.schema.alterTable('posts', async (table) => {
    table.timestamp('updated_at').alter()
    table.timestamp('created_at').alter()
    table.timestamp('fulfilled_at').alter()
    table.timestamp('deactivated_at').alter()
  })

  await knex.schema.alterTable('comments', async (table) => {
    table.timestamp('created_at').alter()
    table.timestamp('deactivated_at').alter()
  })

  await knex.schema.alterTable('contributions', async (table) => {
    table.timestamp('contributed_at').notNull().alter()
  })

  await knex.schema.alterTable('follows', async (table) => {
    table.timestamp('added_at').alter()
  })

  await knex.schema.alterTable('group_invites', async (table) => {
    table.timestamp('created_at').notNull().alter()
    table.timestamp('used_at').alter()
  })

  await knex.schema.alterTable('media', async (table) => {
    table.timestamp('created_at').alter()
  })

  await knex.schema.alterTable('users', async (table) => {
    table.timestamp('last_login_at').alter()
    table.timestamp('created_at').alter()
    table.timestamp('date_deactivated').alter()
  })

  await knex.schema.alterTable('thanks', async (table) => {
    table.timestamp('date_thanked').notNull().alter()
  })

  await knex.schema.alterTable('votes', async (table) => {
    table.timestamp('date_voted').alter()
  })
}

exports.down = async function(knex) {
}
