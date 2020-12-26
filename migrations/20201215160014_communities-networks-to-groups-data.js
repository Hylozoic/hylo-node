/* globals Network, Group, Community */
require('babel-register')
const Promise = require('bluebird')
const models = require('../api/models')
const { merge, pick } = require('lodash')

const POST = 0
const COMMUNITY = 1
const NETWORK = 2

exports.up = async function(knex) {
  models.init()

  const now = new Date()

  const networkGroups = {}
  const networks = await Network.fetchAll( { withRelated: ['communities'] })

  await Promise.map(networks.models, async (network) => {
    const members = await network.members().fetch()

    // Add a group for the network
    let group = await Group.where({ group_data_id: network.id, group_data_type: NETWORK }).fetch()
    if (!group) {
      group = Group.forge({ created_at: new Date() })
    }

    await group.save(merge(
      pick(network.attributes, 'name', 'slug', 'description', 'banner_url', 'avatar_url', 'created_at'),
      {
        num_members: members.models.length,
        group_data_type: NETWORK,
        group_data_id: network.id, // TODO: dont really need but for safety right now so we can go back and forth
        access_code: await Group.getNewAccessCode(),
        visibility: Group.Visibility.PROTECTED,
        accessibility: Group.Accessibility.RESTRICTED,
        settings: { allow_group_invites: false, public_member_directory: false },
        updated_at: now
      })
    )
    networkGroups[network.id] = group

    // Add group memberships for all users of sub communities
    await Promise.map(members.models, async (user) => {
      const existingMembership = await GroupMembership.where({ group_id: group.id, user_id: user.id }).fetch()
      return existingMembership || await GroupMembership.forge({
        group_id: group.id,
        user_id: user.id,
        group_data_type: NETWORK, // TODO: remove this since it is duplicate (not normalized)?
        active: true,
        settings: { following: true },
        created_at: now,
        updated_at: now
      }).save()
    })

    // Setup moderator roles
    const moderators = await network.moderators()
    await Promise.map(moderators.models, async (user) => {
      const existingMembership = await GroupMembership.where({ group_id: group.id, user_id: user.id }).fetch()
      const member = existingMembership || GroupMembership.forge({
        group_id: group.id,
        user_id: user.id,
        group_data_type: NETWORK,
        active: true,
        settings: { following: true },
        created_at: now,
        updated_at: now,
      })
      await member.save({ role: GroupMembership.Role.MODERATOR })
    })

    // Add network posts to the new group
    const posts = await network.posts()
    await Promise.map(posts.models, async (post) => {
      await PostMembership.forge({ post_id: post.id, group_id: group.id }).save()
    })
    // TODO future: remove network_posts table

    await knex('saved_searches').where({ group_id: network.id, context: 'network' }).update({ group_id: group.id, context: 'group' })

    return Promise.resolve()
  }, { concurrency: 30 })

  const communities = await Community.fetchAll()
  await Promise.map(communities.models, async (community) => {
    let group = await Group.where({ group_data_id: community.id, group_data_type: COMMUNITY }).fetch()
    if (!group) {
      group = Group.forge({
        group_data_id: community.id, // TODO: dont really need this but for safety right now so we can go back and forth
        group_data_type: COMMUNITY,
        created_at: new Date()
      })
    }

    await group.save(merge(
      pick(community.attributes, 'name', 'slug', 'description', 'banner_url', 'avatar_url', 'created_at', 'location', 'location_id', 'num_members'),
      {
        access_code: community.attributes.beta_access_code,
        visibility: community.attributes.hidden ? Group.Visibility.HIDDEN : community.attributes.is_public ? Group.Visibility.PUBLIC : Group.Visibility.PROTECTED,
        accessibility: community.attributes.is_auto_joinable ? Group.Accessibility.OPEN : Group.Accessibility.RESTRICTED,
        slack_hook_url: community.attributes.slack_hook_url,
        slack_team: community.attributes.slack_team,
        slack_configure_url: community.attributes.slack_configure_url,
        settings: { allow_group_invites: community.attributes.allow_community_invites, public_member_directory: community.attributes.public_member_directory },
        updated_at: now
      }
    ))

    // Setup parent child relationship between network group and community group
    const network_id = community.attributes.network_id
    if (network_id && networkGroups[network_id]) {
      await GroupConnection.forge({
        parent_group_id: networkGroups[network_id].id,
        child_group_id: group.id,
        active: true,
        created_at: now,
        updated_at: now
      }).save()
    }

    // Replace community ids with group ids
    await knex('activities').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('groups_posts').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('groups_tags').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('group_invites').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('tag_follows').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('join_requests').where({ community_id: community.id }).update({ group_id: group.id })
    await knex('saved_searches').where({ group_id: community.id, context: 'community' }).update({ group_id: group.id, context: 'group' })
  }, { concurrency: 30 })

  // Move post group_memberships into posts_users
  await knex.raw("INSERT INTO posts_users \
    (user_id, post_id, last_read_at, following, created_at, updated_at, project_role_id, active) \
    (SELECT user_id, groups.group_data_id, (group_memberships.settings->>'lastReadAt')::timestamptz as last_read_at, (group_memberships.settings->>'following')::boolean as following, group_memberships.created_at, ? as updated_at, project_role_id, group_memberships.active \
          FROM group_memberships left join groups on groups.id = group_memberships.group_id WHERE groups.group_data_type = ?) \
    ON CONFLICT ON CONSTRAINT posts_users_post_id_user_id_unique DO UPDATE SET last_read_at = excluded.last_read_at, following=excluded.following, updated_at=excluded.updated_at, project_role_id=excluded.project_role_id, active=excluded.active; \
  ", [new Date(), POST])

  // Delete post groups and group memberships
  await knex('group_memberships').where('group_data_type', POST).del()
  await knex('groups').where('group_data_type', POST).del()

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

  // Add these foreign key constraints on group_id columns after we delete the old groups to make that way faster
  await knex.raw('alter table activities add constraint activities_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table groups_posts add constraint groups_posts_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table groups_tags add constraint groups_tags_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table group_invites add constraint group_invites_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table tag_follows add constraint tag_follows_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
  await knex.raw('alter table join_requests add constraint join_requests_group_id_foreign foreign key (group_id) references groups(id) deferrable initially deferred')
}

exports.down = async function(knex) {
  models.init()

  // Remove group to group connections
  await knex.raw('truncate table group_connections')

  // Remove memberships in groups that were networks
  await knex('group_memberships').where('group_data_type', NETWORK).del()

  // For each network remove the groups_posts we created
  const networks = await Network.fetchAll()
  await Promise.map(networks.models, async (network) => {
    const group = await Group.where({ group_data_id: network.id, group_data_type: NETWORK }).fetch()
    await knex('groups_posts').where('group_id', group.id).del()
    // XXX: not trying to create networks_posts for all groups that would be in the network
  })

  // Reset saved_searches context
  await knex('saved_searches').where({ context: 'group' }).update({ context: 'community' })

  // Recreate groups for posts and move posts_users back into group_memberships
  await knex.raw("INSERT INTO groups \
    (group_data_type, group_data_id, active, created_at, updated_at) \
    (SELECT 0, posts.id, posts.active, posts.created_at, posts.updated_at FROM posts) \
    ON CONFLICT ON CONSTRAINT groups_group_data_id_group_data_type_unique DO UPDATE SET active = excluded.active; \
  ")

  await knex.raw("INSERT INTO group_memberships \
    (user_id, group_id, group_data_type, settings, created_at, updated_at, project_role_id, active) \
    (SELECT user_id, groups.id, 0, jsonb_build_object('lastReadAt', last_read_at, 'following', following) as settings, \
            posts_users.created_at, posts_users.updated_at, project_role_id, posts_users.active \
      FROM posts_users left join groups on groups.group_data_id = posts_users.post_id) \
    ON CONFLICT ON CONSTRAINT group_memberships_group_id_user_id_unique DO UPDATE SET settings = excluded.settings, project_role_id=excluded.project_role_id, active=excluded.active; \
  ")

  await knex.raw('alter table activities drop constraint activities_group_id_foreign')
  await knex.raw('alter table groups_posts drop constraint groups_posts_group_id_foreign')
  await knex.raw('alter table groups_tags drop constraint groups_tags_group_id_foreign')
  await knex.raw('alter table group_invites drop constraint group_invites_group_id_foreign')
  await knex.raw('alter table tag_follows drop constraint tag_follows_group_id_foreign')
  await knex.raw('alter table join_requests drop constraint join_requests_group_id_foreign')
}
