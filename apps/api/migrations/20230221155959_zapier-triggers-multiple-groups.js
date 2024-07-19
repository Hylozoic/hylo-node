
exports.up = async function (knex) {
  await knex.schema.createTable('zapier_triggers_groups', table => {
    table.increments().primary()
    table.bigInteger('zapier_trigger_id').references('id').inTable('zapier_triggers')
    table.bigInteger('group_id').references('id').inTable('groups')
    table.index(['zapier_trigger_id'])
  })

  await knex.raw('alter table zapier_triggers_groups alter constraint zapier_triggers_groups_zapier_trigger_id_foreign deferrable initially deferred')
  await knex.raw('alter table zapier_triggers_groups alter constraint zapier_triggers_groups_group_id_foreign deferrable initially deferred')

  await knex.raw('insert into zapier_triggers_groups (zapier_trigger_id, group_id) (select id, group_id from zapier_triggers)')

  await knex.schema.table('zapier_triggers', table => {
    table.dropColumn('group_id')
    table.jsonb('params')
  })
}

exports.down = async function (knex) {
  await knex.schema.table('zapier_triggers', table => {
    table.dropColumn('params')
    table.bigInteger('group_id').references('id').inTable('groups')
  })
  await knex.raw('UPDATE zapier_triggers SET group_id = \'externalLink\' WHERE type= \'externalLink\'')
  await knex.schema.dropTable('zapier_triggers_groups')
}
