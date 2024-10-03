
exports.up = async function (knex) {
  // Drop moderation_actions_platform_agreements table
  await knex.schema.dropTableIfExists('moderation_actions_platform_agreements')

  // Drop platform_agreements table
  await knex.schema.dropTableIfExists('platform_agreements')

  await knex.schema.createTable('platform_agreements', table => {
    table.increments('id').primary()
    table.text('text')
    table.text('type')
  })

  await knex('platform_agreements').insert([
    { text: 'Inappropriate Content', type: 'public' },
    { text: 'Trolling', type: 'public' },
    { text: 'Sexual Content', type: 'public' },
    { text: 'Violence', type: 'public' },
    { text: 'Spam, Advertising or Promotion', type: 'public' },
    { text: 'Violence, Abuse, & Self-Harm', type: 'anywhere' },
    { text: 'Privacy or Consent Violation', type: 'anywhere' },
    { text: 'Illegal Activity', type: 'anywhere' },
    { text: 'Platform Manipulation', type: 'anywhere' },
    { text: 'Civic Integrity', type: 'anywhere' },
    { text: 'Deceptive Identity (anonymous or clear parody permitted)', type: 'anywhere' }
  ])

  await knex.schema.createTable('moderation_actions_platform_agreements', table => {
    table.increments().primary()
    table.integer('moderation_action_id').references('id').inTable('moderation_actions')
    table.integer('platform_agreement_id').references('id').inTable('platform_agreements')
  })
}

exports.down = async function (knex) {
  // Drop moderation_actions_platform_agreements table
  await knex.schema.dropTable('moderation_actions_platform_agreements')

  // Drop platform_agreements table
  await knex.schema.dropTable('platform_agreements')
}
