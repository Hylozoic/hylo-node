exports.up = async function(knex) {
  // Drop constraints if they exist to prevent errors when migrating
  await knex.raw('alter table activities drop constraint if exists activities_group_id_foreign')
  await knex.raw('alter table groups_posts drop constraint if exists groups_posts_group_id_foreign')
  await knex.raw('alter table groups_tags drop constraint if exists groups_tags_group_id_foreign')
  await knex.raw('alter table group_invites drop constraint if exists group_invites_group_id_foreign')
  await knex.raw('alter table tag_follows drop constraint if exists tag_follows_group_id_foreign')
  await knex.raw('alter table join_requests drop constraint if exists join_requests_group_id_foreign')
  
  // Add these foreign key constraints on group_id columns after we delete the old groups to make that way faster
  await knex.raw('alter table activities add constraint activities_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table groups_posts add constraint groups_posts_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table groups_tags add constraint groups_tags_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table group_invites add constraint group_invites_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table tag_follows add constraint tag_follows_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table join_requests add constraint join_requests_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')

  // make group_id columns not nullable
  await knex.schema.alterTable('groups_posts', table => {
    table.bigInteger('group_id').notNullable().alter()
  })

  await knex.schema.alterTable('groups_tags', table => {
    table.bigInteger('group_id').notNullable().alter()
  })

  await knex.schema.alterTable('group_invites', table => {
    table.bigInteger('group_id').notNullable().alter()
  })

  await knex.schema.alterTable('tag_follows', table => {
    table.bigInteger('group_id').notNullable().alter()
  })

  await knex.schema.alterTable('join_requests', table => {
    table.bigInteger('group_id').notNullable().alter()
  })
}

exports.down = async function(knex) {
  await knex.raw('alter table activities drop constraint activities_group_id_foreign')
  await knex.raw('alter table groups_posts drop constraint groups_posts_group_id_foreign')
  await knex.raw('alter table groups_tags drop constraint groups_tags_group_id_foreign')
  await knex.raw('alter table group_invites drop constraint group_invites_group_id_foreign')
  await knex.raw('alter table tag_follows drop constraint tag_follows_group_id_foreign')
  await knex.raw('alter table join_requests drop constraint join_requests_group_id_foreign')

  await knex.schema.alterTable('groups_posts', table => {
    table.bigInteger('group_id').nullable().alter()
  })

  await knex.schema.alterTable('groups_tags', table => {
    table.bigInteger('group_id').nullable().alter()
  })

  await knex.schema.alterTable('group_invites', table => {
    table.bigInteger('group_id').nullable().alter()
  })

  await knex.schema.alterTable('tag_follows', table => {
    table.bigInteger('group_id').nullable().alter()
  })

  await knex.schema.alterTable('join_requests', table => {
    table.bigInteger('group_id').nullable().alter()
  })
}
