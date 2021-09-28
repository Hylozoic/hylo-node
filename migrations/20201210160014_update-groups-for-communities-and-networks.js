const POST = 0
const COMMUNITY = 1
const NETWORK = 2

exports.up = async function(knex) {
  await knex.schema.table('groups', async (table) => {
    table.string('name')
    table.string('slug')
    table.text('description')
    table.string('location')
    table.bigInteger('location_id').references('id').inTable('locations')
    table.string('avatar_url')
    table.string('banner_url')
    table.integer('visibility').defaultTo(1)
    table.integer('accessibility').defaultTo(1)
    table.bigInteger('created_by_id').references('id').inTable('users')
    table.string('access_code')
    table.jsonb('settings')
    table.integer('num_members')
    table.text('slack_hook_url')
    table.text('slack_team')
    table.text('slack_configure_url')

    table.unique(['slug'])
    table.unique(['access_code'])
    table.index(['visibility'])

    /**** Not copying over:
    - background_url
    - banner_pos
    - daily_digest
    - membership_fee
    - plan_guid
    - category
    - leader_id
    - welcome_message ?
    - default_public_content
    - network_id
    - hidden (now visibility)
    - is_public (now visibility)
    - is_auto_joinable (now part of accessibility)
    - allow_community_invites (becomes a setting)
    - public_member_directory (becomes a setting)
    ****/
  })
  await knex.raw('alter table groups alter constraint groups_created_by_id_foreign deferrable initially deferred')
  await knex.raw('alter table groups alter constraint groups_location_id_foreign deferrable initially deferred')

  await knex.schema.table('activities', async (table) => {
    table.bigInteger('group_id')
  })

  await knex.schema.renameTable('communities_posts', 'groups_posts')
  await knex.schema.alterTable('groups_posts', async (table) => {
    table.bigInteger('group_id')
    // Make community_id nullable since we wont be using it anymore
    // TODO next: drop community_id
    table.bigInteger('community_id').nullable().alter()
    table.unique(['group_id', 'post_id'])
  })

  // Make group_data_type nullable for now, TODO: remove completely
  await knex.schema.alterTable('group_memberships', async (table) => {
    table.integer('group_data_type').nullable().alter()
  })

  await knex.schema.renameTable('communities_tags', 'groups_tags')
  await knex.schema.table('groups_tags', async (table) => {
    table.bigInteger('group_id')
    table.unique(['group_id', 'tag_id'])
    table.index(['group_id', 'visibility'])
  })

  knex.schema.dropTable('communities_users')

  await knex.schema.renameTable('community_invites', 'group_invites')
  await knex.schema.alterTable('group_invites', async (table) => {
    table.bigInteger('group_id')
    table.bigInteger('community_id').nullable().alter()
    table.index(['group_id'])
  })

  await knex.schema.table('group_connections', async (table) => {
    table.dropColumn('parent_group_data_type')
    table.dropColumn('child_group_data_type')
  })

  await knex.schema.table('tag_follows', async (table) => {
    table.bigInteger('group_id')
    table.unique(['group_id', 'tag_id', 'user_id'])
  })

  await knex.schema.table('join_requests', async (table) => {
    table.bigInteger('group_id')
    table.unique(['group_id', 'user_id'])
  })

  await knex.schema.table('saved_searches', async (table) => {
    table.renameColumn('context_id', 'group_id').comment("")
  })

  await knex.schema.table('posts_users', t => {
    t.bigInteger('project_role_id').references('id').inTable('project_roles')
    t.boolean('following').defaultTo(true)
    t.boolean('active').defaultTo(true)
    t.unique(['post_id', 'user_id'])
  })
  await knex.raw('alter table posts_users alter constraint posts_users_project_role_id_foreign deferrable initially deferred')
}

exports.down = async function(knex) {
  await knex.schema.table('groups', async (table) => {
    table.dropColumn('name')
    table.dropColumn('slug')
    table.dropColumn('description')
    table.dropColumn('location')
    table.dropColumn('created_by_id')
    table.dropColumn('avatar_url')
    table.dropColumn('banner_url')
    table.dropColumn('location_id')
    table.dropColumn('access_code')
    table.dropColumn('visibility')
    table.dropColumn('accessibility')
    table.dropColumn('settings')
    table.dropColumn('num_members')
    table.dropColumn('slack_hook_url')
    table.dropColumn('slack_team')
    table.dropColumn('slack_configure_url')
  })

  await knex.schema.table('activities' , async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.renameTable('groups_posts', 'communities_posts')
  await knex.schema.alterTable('communities_posts', async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.renameTable('groups_tags', 'communities_tags')
  await knex.schema.table('communities_tags', async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.renameTable('group_invites', 'community_invites')
  await knex.schema.alterTable('community_invites', async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.table('group_connections', async (table) => {
    table.integer('parent_group_data_type').notNullable()
    table.integer('child_group_data_type').notNullable()
  })

  await knex.schema.table('tag_follows', async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.table('join_requests', async (table) => {
    table.dropColumn('group_id')
  })

  await knex.schema.table('saved_searches', async (table) => {
    table.renameColumn('group_id', 'context_id')
  })

  await knex.schema.table('posts_users', t => {
    t.dropColumn('project_role_id')
    t.dropColumn('following')
    t.dropColumn('active')
    t.dropUnique(['post_id', 'user_id'])
  })

  // XXX: weird to do this in this migration since these groups get created in the next migration,
  //      but can't do this in same transaction as the next migration's down function, so can only do here
  await knex('groups').where('group_data_type', NETWORK).del()
}
