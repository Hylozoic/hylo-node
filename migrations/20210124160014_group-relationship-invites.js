const Promise = require('bluebird')

exports.up = async function(knex) {
  await knex.schema.createTable('group_relationship_invites', table => {
    table.increments().primary()

    table.bigInteger('from_group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('to_group_id').references('id').inTable('groups').notNullable()
    table.integer('type').notNullable() // parent-to-child, child-to-parent, eventually partnership
    table.bigInteger('created_by_id').references('id').inTable('users').notNullable()
    table.timestamp('created_at')
    table.integer('status').defaultsTo(0) // 0 = pending, 1 = accepted, 2 = rejected, 3 = canceled
    table.bigInteger('processed_by_id').references('id').inTable('users')
    table.timestamp('processed_at')
    table.bigInteger('canceled_by_id').references('id').inTable('users')
    table.timestamp('canceled_at')
    table.integer('sent_count')
    table.timestamp('last_sent_at')

    table.text('subject')
    table.text('message')

    table.timestamp('updated_at')

    table.index(['from_group_id', 'to_group_id'])
  })

  await knex.schema.renameTable('group_connections', 'group_relationships')
  await knex.schema.alterTable('group_relationships', async (table) => {
    table.jsonb('settings').defaultsTo('{}').alter()
  })
  await knex('group_relationships').update({ settings: '{}' })

  return knex.schema.table('activities', async (table) => {
    table.bigInteger('other_group_id').references('id').inTable('groups')
    table.dropColumn('action')
  })
}

exports.down = async function(knex) {
  await knex.schema.dropTable('group_relationship_invites')
  await knex.schema.renameTable('group_relationships', 'group_connections')
  return knex.schema.table('activities', async (table) => {
    table.dropColumn('other_group_id')
    table.string('action')
  })
}
