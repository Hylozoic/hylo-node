
exports.up = async function (knex) {
  // Create moderation_actions table
  await knex.schema.createTable('moderation_actions', table => {
    table.increments('id').primary()
    table.text('text')
    table.bigInteger('reporter_id').references('id').inTable('users').notNullable()
    table.bigInteger('post_id').references('id').inTable('posts').notNullable()
    table.text('status')
    table.text('anonymous')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  // Create platform_agreements table
  await knex.schema.createTable('platform_agreements', table => {
    table.increments('id').primary()
    table.text('text')
  })

  await knex.schema.createTable('moderation_actions_platform_agreements', table => {
    table.increments().primary()
    table.integer('moderation_action_id').references('id').inTable('moderation_actions')
    table.integer('platform_agreement_id').references('id').inTable('platform_agreements')
  })

  // Insert platform agreements
  await knex('platform_agreements').insert([
    { text: 'I pledge to behave on Hylo in ways that contribute to an open, welcoming, and healthy community, and to support other members in feeling respected and appreciated.' },
    { text: 'I will respect differing viewpoints and experiences, and work to find common ground and shared values with other Hylo members.' },
    { text: 'I commit to learning from every interaction. I will listen to feedback, adapt, and embrace responsibility for mistakes as opportunities for growth.' },
    { text: 'I pledge to share my voice, ideas, and skills in service to my group(s) on Hylo, recognizing that working together leads to better outcomes.' },
    { text: 'If I see an opportunity to improve something on the Hylo platform or within my group, I will take action to make it better.' },
    { text: 'I commit to upholding the Code of Conduct & Cultural Norms, and Terms of Use, and I agree to participate in accountability processes when necessary.' }
  ])

  // Create moderation_actions_agreements join table
  await knex.schema.createTable('moderation_actions_agreements', table => {
    table.increments('id').primary()
    table.bigInteger('moderation_action_id').references('id').inTable('moderation_actions').notNullable()
    table.bigInteger('agreement_id').references('id').inTable('agreements').notNullable()
  })

  // Alter posts_users table to add clicked_through column
  await knex.schema.table('posts_users', table => {
    table.boolean('clickthrough')
  })

  await knex.schema.table('posts', table => {
    table.specificType('flagged_groups', 'bigint[]')
  })
}

exports.down = async function (knex) {
  await knex.schema.table('posts', table => {
    table.dropColumn('flagged_groups')
  })

  // Drop moderation_actions_agreements table
  await knex.schema.dropTable('moderation_actions_agreements')

  // Drop moderation_actions_platform_agreements table
  await knex.schema.dropTable('moderation_actions_platform_agreements')

  // Drop platform_agreements table
  await knex.schema.dropTable('platform_agreements')

  // Drop moderation_actions table
  await knex.schema.dropTable('moderation_actions')

  // Drop clicked_through column from posts_users table
  await knex.schema.table('posts_users', table => {
    table.dropColumn('clickthrough')
  })
}
