
exports.up = async function (knex, Promise) {
  await knex.schema.createTable('responsiblities', table => {
    table.increments().primary()
    table.text('title').notNullable()
    table.text('description')
    table.timestamp('created_at')
    table.timestamp('updated_at')
    table.bigInteger('group_id').references('id').inTable('groups')
  })

  const responsibilitiesData = [
    {
      title: 'Administration',
      description: 'Allows for editing group settings, exporting data, and deleting the group.'
    },
    {
      title: 'Add Members',
      description: 'The ability to invite and add new people to the group, and to accept or reject join requests.'
    },
    {
      title: 'Remove Members',
      description: 'The ability to remove a member from the group.'
    },
    {
      title: 'Remove Content',
      description: 'When content appears in your community that violates your agreements, you have the ability to remove that post from the group.'
    }
  ]

  // Insert responsibilities into the 'responsibilities' table
  await knex('responsiblities').insert(responsibilitiesData)

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
      name: 'Manager',
      description: 'The manager is empowered to do everything related to group administration.',
      emoji: '💼'
    },
    {
      name: 'Moderator',
      description: 'Moderators are expected to actively engage in discussion, encourage participation, and take corrective action if a member violates group agreements.',
      emoji: '🛡️'
    },
    {
      name: 'Host',
      description: 'Hosts are responsible for cultivating a good atmosphere by welcoming and orienting new members, embodying the group culture and agreements, and helping members connect with relevant content and people.',
      emoji: '🎉'
    }
  ]

  // Insert common roles into the 'common_roles' table
  await knex('common_roles').insert(commonRolesData)

  await knex.schema.createTable('group_roles_responsibilities', table => {
    table.increments().primary()
    table.bigInteger('group_role_id').unsigned().references('id').inTable('group_roles')
    table.bigInteger('responsibility_id').unsigned().references('id').inTable('responsiblities')
  })

  await knex.schema.createTable('common_roles_responsibilities', table => {
    table.increments().primary()
    table.bigInteger('common_role_id').unsigned().references('id').inTable('common_roles')
    table.bigInteger('responsibility_id').unsigned().references('id').inTable('responsiblities')
  })

  await knex.schema.createTable('common_roles_group_memberships', table => {
    table.increments().primary()
    table.bigInteger('common_role_id').unsigned().references('id').inTable('common_roles')
    table.bigInteger('group_membership_id').unsigned().references('id').inTable('group_memberships')
  })
}

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('group_roles_responsibilities')
  await knex.schema.dropTableIfExists('common_roles_responsibilities')
  await knex.schema.dropTableIfExists('common_roles_group_memberships')
  await knex.schema.dropTableIfExists('responsiblities')
  await knex.schema.dropTableIfExists('common_roles')
}
