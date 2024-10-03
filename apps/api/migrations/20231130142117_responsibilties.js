
exports.up = async function (knex) {
  await knex.schema.createTable('responsibilities', table => {
    table.increments().primary()
    table.text('title').notNullable()
    table.text('description')
    table.text('type')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.bigInteger('group_id').references('id').inTable('groups')
  })

  const responsibilitiesData = [
    {
      title: 'Administration',
      description: 'Allows for editing group settings, exporting data, and deleting the group.',
      type: 'system'
    },
    {
      title: 'Add Members',
      description: 'The ability to invite and add new people to the group, and to accept or reject join requests.',
      type: 'system'
    },
    {
      title: 'Remove Members',
      description: 'The ability to remove a member from the group.',
      type: 'system'
    },
    {
      title: 'Manage Content',
      description: 'Adjust group topics, custom views and manage content that contradicts the agreements of the group.',
      type: 'system'
    }
  ]

  // Insert responsibilities into the 'responsibilities' table
  await knex('responsibilities').insert(responsibilitiesData)

  await knex.schema.createTable('common_roles', table => {
    table.increments().primary()
    table.text('name').notNullable()
    table.text('description')
    table.text('emoji')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  const commonRolesData = [
    {
      name: 'Coordinator',
      description: 'Coordinators are empowered to do everything related to group administration.',
      emoji: '🪄'
    },
    {
      name: 'Moderator',
      description: 'Moderators are expected to actively engage in discussion, encourage participation, and take corrective action if a member violates group agreements.',
      emoji: '⚖️'
    },
    {
      name: 'Host',
      description: 'Hosts are responsible for cultivating a good atmosphere by welcoming and orienting new members, embodying the group culture and agreements, and helping members connect with relevant content and people.',
      emoji: '👋'
    }
  ]

  // Insert common roles into the 'common_roles' table
  await knex('common_roles').insert(commonRolesData)

  await knex.schema.createTable('group_roles_responsibilities', table => {
    table.increments().primary()
    table.bigInteger('group_role_id').references('id').inTable('groups_roles')
    table.bigInteger('responsibility_id').references('id').inTable('responsibilities')
  })

  await knex.schema.createTable('common_roles_responsibilities', table => {
    table.increments().primary()
    table.bigInteger('common_role_id').references('id').inTable('common_roles')
    table.bigInteger('responsibility_id').references('id').inTable('responsibilities')
  })

  await knex.schema.createTable('group_memberships_common_roles', table => {
    table.increments().primary()
    table.bigInteger('common_role_id').references('id').inTable('common_roles')
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('group_id').references('id').inTable('groups')
    table.index(['group_id', 'user_id'])
  })

  await knex.schema.renameTable('members_roles', 'group_memberships_group_roles')

  /* Step 1: Look up the id of the Coordinator in the common_roles table
     Step 2: Look up the ids of the four different inserted responsibilities
     Step 3: Insert the combination of the two sets of ids (four rows) into common_roles_responsibilities
     Step 4: Look up the id of the Moderator in the common_roles table
     Step 5: Look up the ids of the Manage Content and Remove Members rows in the responsibilities table
     Step 6: Insert the combination of the two sets of ids (two rows) into common_roles_responsibilities
     Step 7: Look up the id of the Host in the common_roles table
     Step 8: Look up the ids of the Invite Members row in the responsibilities table
     Step 9: Insert the combination of the two sets of ids (one row) into common_roles_responsibilities
  */
  await knex.raw(`
    WITH CoordinatorCTE AS (
      SELECT id
      FROM common_roles
      WHERE name = 'Coordinator'
    ),
    ResponsibilitiesCTE AS (
      SELECT id
      FROM responsibilities
      WHERE title IN ('Administration', 'Add Members', 'Remove Members', 'Manage Content')
    ),
    InsertCoordinatorResponsibilities AS (
      INSERT INTO common_roles_responsibilities (common_role_id, responsibility_id)
      SELECT CoordinatorCTE.id, ResponsibilitiesCTE.id
      FROM CoordinatorCTE, ResponsibilitiesCTE
      RETURNING *
    ),
    ModeratorCTE AS (
      SELECT id
      FROM common_roles
      WHERE name = 'Moderator'
    ),
    ManageContentRemoveMembersCTE AS (
      SELECT id
      FROM responsibilities
      WHERE title IN ('Manage Content', 'Remove Members')
    ),
    InsertModeratorResponsibilities AS (
      INSERT INTO common_roles_responsibilities (common_role_id, responsibility_id)
      SELECT ModeratorCTE.id, ManageContentRemoveMembersCTE.id
      FROM ModeratorCTE, ManageContentRemoveMembersCTE
      RETURNING *
    ),
    HostCTE AS (
      SELECT id
      FROM common_roles
      WHERE name = 'Host'
    ),
    InviteMembersCTE AS (
      SELECT id
      FROM responsibilities
      WHERE title = 'Add Members'
    )
    INSERT INTO common_roles_responsibilities (common_role_id, responsibility_id)
    SELECT HostCTE.id, InviteMembersCTE.id
    FROM HostCTE, InviteMembersCTE
    RETURNING *
  `)

  // Give all moderators a 'Coordinator' common role
  await knex.raw(`
    INSERT INTO group_memberships_common_roles (common_role_id, user_id, group_id)
    SELECT
      (SELECT id FROM common_roles WHERE name = 'Coordinator') AS common_role_id,
      m.user_id,
      m.group_id
    FROM group_memberships m
    WHERE m.role = 1;
  `)

  await knex.schema.table('groups', table => {
    table.renameColumn('moderator_descriptor', 'steward_descriptor')
    table.renameColumn('moderator_descriptor_plural', 'steward_descriptor_plural')
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('group_roles_responsibilities')
  await knex.schema.dropTableIfExists('common_roles_responsibilities')
  await knex.schema.dropTableIfExists('group_memberships_common_roles')
  await knex.schema.dropTableIfExists('responsibilities')
  await knex.schema.dropTableIfExists('common_roles')
  await knex.schema.renameTable('group_memberships_group_roles', 'members_roles')

  await knex.schema.table('groups', table => {
    table.renameColumn('steward_descriptor', 'moderator_descriptor')
    table.renameColumn('steward_descriptor_plural', 'moderator_descriptor_plural')
  })
}
